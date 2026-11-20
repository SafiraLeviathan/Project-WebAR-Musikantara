<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { GestureFrame } from '../types/gesture';

const emit = defineEmits<{
  gesture: [frame: GestureFrame | null];
  status: [message: string];
  hands: [count: number];
}>();

const video = ref<HTMLVideoElement | null>(null);

type Delegate = 'GPU' | 'CPU';
type RuntimeSource = { label: string; basePath: string };
type LandmarkerRuntime = {
  instance: HandLandmarker;
  delegate: Delegate;
  source: string;
};

let stream: MediaStream | null = null;
let landmarker: HandLandmarker | null = null;
let activeDelegate: Delegate | null = null;
let rafId = 0;
let lastProcessedAt = 0;
let lastVideoTime = -1;
let lastTimestamp = 0;
let smoothed: GestureFrame | null = null;
let lastCount = 0;
let stopped = true;
let generation = 0;
let switchingRuntime = false;
let activeAbortController: AbortController | null = null;

const MEDIAPIPE_VERSION = '1.2.3';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const LOCAL_WASM_PATH = `${import.meta.env.BASE_URL}mediapipe/wasm`.replace(/\/$/, '');
const CDN_WASM_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const RUNTIME_SOURCES: RuntimeSource[] = [
  { label: 'WASM lokal', basePath: LOCAL_WASM_PATH },
  { label: 'CDN resmi', basePath: CDN_WASM_PATH }
];
const FRAME_INTERVAL = 1000 / 20;
const LANDMARK_INDICES = [0, 5, 9, 13, 17] as const;

function stopTracks(mediaStream: MediaStream | null): void {
  if (!mediaStream) return;
  for (const track of mediaStream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Browser/device may already have ended this track.
    }
  }
}

function isCurrent(currentGeneration: number): boolean {
  return !stopped && currentGeneration === generation;
}

function errorText(error: unknown): string {
  if (error instanceof AggregateError) {
    return error.errors.map((item) => errorText(item)).join(' | ');
  }
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause ? `${error.message} (${errorText(cause)})` : error.message;
  }
  return String(error);
}

function closeLandmarker(instance: HandLandmarker | null): void {
  if (!instance) return;
  try {
    instance.close();
  } catch (error) {
    console.warn('[Musikantara] Gagal menutup instance MediaPipe:', error);
  }
}

function averagePoint(points: Array<{ x: number; y: number }>, indices: readonly number[]) {
  if (indices.some((index) =>
    !points[index] ||
    !Number.isFinite(points[index]?.x) ||
    !Number.isFinite(points[index]?.y)
  )) {
    return null;
  }
  const total = indices.reduce(
    (sum, index) => ({
      x: sum.x + points[index]!.x,
      y: sum.y + points[index]!.y
    }),
    { x: 0, y: 0 }
  );
  return { x: total.x / indices.length, y: total.y / indices.length };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function smoothFrame(raw: GestureFrame): GestureFrame {
  if (!smoothed || smoothed.handCount !== raw.handCount) {
    smoothed = raw;
    return raw;
  }
  const alpha = 0.28;
  let angleDelta = raw.angle - smoothed.angle;
  while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
  while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
  smoothed = {
    ...raw,
    x: smoothed.x + (raw.x - smoothed.x) * alpha,
    y: smoothed.y + (raw.y - smoothed.y) * alpha,
    angle: smoothed.angle + angleDelta * alpha,
    distance: smoothed.distance + (raw.distance - smoothed.distance) * alpha
  };
  return smoothed;
}

async function fetchModelBuffer(signal: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(MODEL_URL, { signal, cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Model gestur gagal dimuat (${response.status} ${response.statusText}).`);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 100_000) {
    throw new Error('File model gestur terlalu kecil atau tidak valid.');
  }
  return new Uint8Array(buffer);
}

async function createOneLandmarker(
  source: RuntimeSource,
  delegate: Delegate,
  modelBuffer: Uint8Array
): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(source.basePath);

  // MediaPipe's VisionTaskOptions accepts a canvas explicitly. Supplying a
  // regular HTML canvas avoids browser-specific OffscreenCanvas initialization.
  const processingCanvas = document.createElement('canvas');
  processingCanvas.width = 640;
  processingCanvas.height = 480;

  return HandLandmarker.createFromOptions(fileset, {
    canvas: processingCanvas,
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.48,
    minHandPresenceConfidence: 0.48,
    minTrackingConfidence: 0.48,
    baseOptions: {
      modelAssetBuffer: modelBuffer.slice(),
      delegate
    }
  });
}

async function createLandmarker(
  currentGeneration: number,
  delegates: readonly Delegate[] = ['GPU', 'CPU']
): Promise<LandmarkerRuntime> {
  const controller = activeAbortController;
  if (!controller) throw new Error('Permintaan inisialisasi sensor sudah dibatalkan.');

  emit('status', 'Memuat model deteksi tangan…');
  const modelBuffer = await fetchModelBuffer(controller.signal);
  if (!isCurrent(currentGeneration)) {
    throw new DOMException('Inisialisasi sensor dibatalkan.', 'AbortError');
  }

  const failures: string[] = [];
  for (const source of RUNTIME_SOURCES) {
    if (!isCurrent(currentGeneration)) {
      throw new DOMException('Inisialisasi sensor dibatalkan.', 'AbortError');
    }

    for (const delegate of delegates) {
      if (!isCurrent(currentGeneration)) {
        throw new DOMException('Inisialisasi sensor dibatalkan.', 'AbortError');
      }

      const stage = `${source.label}, delegate ${delegate}`;
      emit('status', `Menyiapkan sensor gestur (${stage})…`);
      try {
        const instance = await createOneLandmarker(source, delegate, modelBuffer);
        if (!isCurrent(currentGeneration)) {
          closeLandmarker(instance);
          throw new DOMException('Inisialisasi sensor dibatalkan.', 'AbortError');
        }
        return { instance, delegate, source: source.label };
      } catch (error) {
        if (!isCurrent(currentGeneration)) throw error;
        const detail = errorText(error);
        failures.push(`${stage}: ${detail}`);
        console.warn(`[Musikantara] Inisialisasi MediaPipe gagal (${stage}):`, error);
      }
    }
  }

  console.error('[Musikantara] Seluruh jalur MediaPipe gagal:', failures);
  throw new Error('WASM atau HandLandmarker tidak dapat diinisialisasi. Detail teknis tersedia di Console browser.');
}

function makeFrame(
  landmarks: Array<Array<{ x: number; y: number }>>,
  timestamp: number
): GestureFrame | null {
  const validHands = landmarks.filter(
    (points) => Array.isArray(points) && points.length >= 21
  );
  if (validHands.length === 0) return null;

  const palms = validHands
    .map((points) => averagePoint(points, LANDMARK_INDICES))
    .filter((point): point is { x: number; y: number } => point !== null)
    .sort((a, b) => a.x - b.x);

  if (palms.length >= 2) {
    const center = {
      x: (palms[0]!.x + palms[1]!.x) / 2,
      y: (palms[0]!.y + palms[1]!.y) / 2
    };
    const dx = palms[1]!.x - palms[0]!.x;
    const dy = palms[1]!.y - palms[0]!.y;
    return {
      x: center.x,
      y: center.y,
      angle: Math.atan2(dy, dx),
      distance: Math.max(0.025, Math.hypot(dx, dy)),
      handCount: 2,
      timestamp
    };
  }

  const points = validHands[0]!;
  const palm = averagePoint(points, LANDMARK_INDICES);
  const wrist = points[0];
  const indexMcp = points[5];
  const thumbTip = points[4];
  const indexTip = points[8];
  if (!palm || !wrist || !indexMcp || !thumbTip || !indexTip) return null;

  const pinch = distance(thumbTip, indexTip);
  return {
    x: palm.x,
    y: palm.y,
    angle: Math.atan2(indexMcp.y - wrist.y, indexMcp.x - wrist.x),
    distance: Math.max(0.018, Math.min(0.35, pinch)),
    handCount: 1,
    timestamp
  };
}

function scheduleFrame(currentGeneration: number): void {
  rafId = requestAnimationFrame((time) => processFrame(time, currentGeneration));
}

function processFrame(now: number, currentGeneration: number): void {
  if (!isCurrent(currentGeneration)) return;
  scheduleFrame(currentGeneration);

  if (switchingRuntime) return;
  const element = video.value;
  const activeLandmarker = landmarker;
  if (!element || !activeLandmarker || element.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  if (element.videoWidth <= 0 || element.videoHeight <= 0) return;
  if (element.currentTime === lastVideoTime || now - lastProcessedAt < FRAME_INTERVAL) return;

  lastVideoTime = element.currentTime;
  lastProcessedAt = now;
  const timestamp = Math.max(now, lastTimestamp + 1);
  lastTimestamp = timestamp;

  try {
    const result = activeLandmarker.detectForVideo(element, timestamp);
    const landmarks = Array.isArray(result?.landmarks) ? result.landmarks : [];
    const count = Math.min(2, landmarks.length);

    if (count !== lastCount) {
      lastCount = count;
      emit('hands', count);
      if (count === 0) {
        smoothed = null;
        emit('gesture', null);
      }
    }

    const frame = makeFrame(landmarks, timestamp);
    if (frame) emit('gesture', smoothFrame(frame));
    else if (count > 0) emit('gesture', null);
  } catch (error) {
    console.error('[Musikantara] MediaPipe detectForVideo gagal:', error);
    if (activeDelegate === 'GPU') {
      void recoverWithCpu(currentGeneration, error);
      return;
    }

    const message = errorText(error);
    stop();
    emit(
      'status',
      `Sensor gestur tidak tersedia: proses deteksi video gagal (${message}). Kontrol standar tetap dapat digunakan.`
    );
  }
}

async function recoverWithCpu(currentGeneration: number, gpuError: unknown): Promise<void> {
  if (switchingRuntime || !isCurrent(currentGeneration)) return;
  switchingRuntime = true;
  cancelAnimationFrame(rafId);
  closeLandmarker(landmarker);
  landmarker = null;
  activeDelegate = null;
  emit('status', 'Menyesuaikan mesin gestur ke mode kompatibilitas…');

  try {
    const runtime = await createLandmarker(currentGeneration, ['CPU']);
    if (!isCurrent(currentGeneration)) {
      closeLandmarker(runtime.instance);
      return;
    }

    landmarker = runtime.instance;
    activeDelegate = runtime.delegate;
    switchingRuntime = false;
    lastProcessedAt = 0;
    lastVideoTime = -1;
    lastTimestamp = 0;
    smoothed = null;
    lastCount = 0;
    emit('status', `Sensor gestur aktif (${runtime.delegate}, ${runtime.source}). Dapat membaca hingga dua tangan.`);
    scheduleFrame(currentGeneration);
  } catch (error) {
    if (!isCurrent(currentGeneration)) return;
    console.error('[Musikantara] Fallback GPU ke CPU juga gagal:', {
      gpu: gpuError,
      cpu: error
    });
    stop();
    emit(
      'status',
      'Sensor gestur tidak tersedia: mode GPU dan CPU gagal dijalankan. Detail teknis tersedia di Console browser. Kontrol standar tetap dapat digunakan.'
    );
  } finally {
    switchingRuntime = false;
  }
}

async function waitForVideoReady(
  element: HTMLVideoElement,
  signal: AbortSignal
): Promise<void> {
  if (
    element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    element.videoWidth > 0 &&
    element.videoHeight > 0
  ) return;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      element.removeEventListener('loadeddata', onReady);
      element.removeEventListener('canplay', onReady);
      signal.removeEventListener('abort', onAbort);
      window.clearTimeout(timeoutId);
    };
    const onReady = () => {
      if (element.videoWidth > 0 && element.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Akses kamera gestur dibatalkan.', 'AbortError'));
    };
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Kamera depan tidak menghasilkan frame video dalam 10 detik.'));
    }, 10_000);

    element.addEventListener('loadeddata', onReady);
    element.addEventListener('canplay', onReady);
    signal.addEventListener('abort', onAbort, { once: true });
    onReady();
  });
}

async function start(): Promise<void> {
  const currentGeneration = ++generation;
  stopped = false;
  switchingRuntime = false;
  activeAbortController?.abort();
  activeAbortController = new AbortController();
  const { signal } = activeAbortController;
  emit('status', 'Meminta akses kamera depan untuk sensor gestur…');

  if (!navigator.mediaDevices?.getUserMedia) {
    emit(
      'status',
      'Sensor gestur tidak tersedia: browser tidak menyediakan akses kamera. Gunakan browser modern melalui HTTPS. Kontrol standar tetap dapat digunakan.'
    );
    return;
  }

  let nextStream: MediaStream | null = null;
  let nextLandmarker: HandLandmarker | null = null;
  let stage = 'membuka kamera depan';

  try {
    nextStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 20, max: 24 }
      }
    });

    if (!isCurrent(currentGeneration)) {
      stopTracks(nextStream);
      return;
    }

    const element = video.value;
    if (!element) throw new Error('Elemen video sensor tidak tersedia.');
    stream = nextStream;
    element.muted = true;
    element.playsInline = true;
    element.srcObject = nextStream;

    stage = 'menunggu frame kamera depan';
    await element.play();
    await waitForVideoReady(element, signal);
    if (!isCurrent(currentGeneration)) return;

    stage = 'memuat mesin MediaPipe';
    const runtime = await createLandmarker(currentGeneration);
    nextLandmarker = runtime.instance;
    if (!isCurrent(currentGeneration)) {
      closeLandmarker(nextLandmarker);
      return;
    }

    landmarker = nextLandmarker;
    nextLandmarker = null;
    activeDelegate = runtime.delegate;
    lastProcessedAt = 0;
    lastVideoTime = -1;
    lastTimestamp = 0;
    smoothed = null;
    lastCount = 0;
    emit(
      'status',
      `Sensor gestur aktif (${runtime.delegate}, ${runtime.source}). Dapat membaca hingga dua tangan.`
    );
    scheduleFrame(currentGeneration);
  } catch (error) {
    const message = errorText(error);
    console.error(`[Musikantara] Sensor gestur gagal pada tahap "${stage}":`, error);
    if (nextLandmarker) closeLandmarker(nextLandmarker);
    if (nextStream && nextStream !== stream) stopTracks(nextStream);
    if (!isCurrent(currentGeneration)) return;
    stop();
    emit(
      'status',
      `Sensor gestur tidak tersedia: ${stage} (${message}). Kontrol standar tetap dapat digunakan.`
    );
  }
}

function stop(): void {
  stopped = true;
  generation += 1;
  switchingRuntime = false;
  activeAbortController?.abort();
  activeAbortController = null;
  cancelAnimationFrame(rafId);
  rafId = 0;

  const element = video.value;
  const attachedStream = element?.srcObject as MediaStream | null;
  stopTracks(stream);
  if (attachedStream !== stream) stopTracks(attachedStream);
  stream = null;

  if (element) {
    try { element.pause(); } catch { /* no-op */ }
    element.srcObject = null;
  }

  const activeLandmarker = landmarker;
  landmarker = null;
  activeDelegate = null;
  closeLandmarker(activeLandmarker);

  smoothed = null;
  lastCount = 0;
  lastVideoTime = -1;
  lastTimestamp = 0;
  emit('hands', 0);
  emit('gesture', null);
}

onMounted(() => void start());
onBeforeUnmount(stop);
</script>

<template>
  <video ref="video" class="sensor-video" muted playsinline autoplay aria-hidden="true"></video>
</template>

<style scoped>
.sensor-video {
  position: fixed;
  z-index: -1;
  top: 0;
  left: -8px;
  width: 2px;
  height: 2px;
  opacity: 0;
  pointer-events: none;
}
</style>
