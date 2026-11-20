<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { INSTRUMENTS, getInstrument } from '../data/instruments';
import type { Instrument } from '../types/instrument';
import type { GestureFrame } from '../types/gesture';
import { GestureTransformController } from '../utils/GestureTransformController';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';

const props = defineProps<{
  cameraEnabled: boolean;
  gestureEnabled: boolean;
  gestureSensitivity: number;
  viewerSensitivity: number;
  gesture: GestureFrame | null;
  sensorStatus: string;
}>();

const emit = defineEmits<{
  toggleCamera: [];
  toggleGesture: [];
  detected: [id: string | null];
  openDetail: [id: string];
  exit: [];
}>();

const stage = ref<HTMLDivElement | null>(null);
const status = ref('Kamera belum diaktifkan');
const error = ref('');
const detectedId = ref<string | null>(null);
const loadingModel = ref(false);
const controlMode = ref<'rotate' | 'move' | 'scale'>('rotate');
const activeInstrument = computed(() => detectedId.value ? getInstrument(detectedId.value) : null);
let runtime: MindARThree | null = null;
let running = false;
let starting = false;
let startGeneration = 0;
const models = new Map<string, THREE.Group>();
const modelBaseScales = new Map<string, number>();
const gestureController = new GestureTransformController();
const loader = new GLTFLoader();
const pointerMap = new Map<number, { x: number; y: number }>();
let pointerButton = 0;
let lastPinchDistance = 0;
let lastPinchAngle = 0;
let lastPinchCenter = { x: 0, y: 0 };
let audio: HTMLAudioElement | null = null;

async function inspectCameras(): Promise<{ front?: string; back?: string }> {
  let probe: MediaStream | null = null;
  try {
    probe = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
    });
    const activeDeviceId = probe.getVideoTracks()[0]?.getSettings().deviceId;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === 'videoinput');
    const front = cameras.find((device) => /front|user|facetime|selfie/i.test(device.label));
    const back = cameras.find((device) => /back|rear|environment|world/i.test(device.label));
    const chosenBack = (activeDeviceId ? cameras.find((device) => device.deviceId === activeDeviceId) : undefined) ?? back;
    return { front: front?.deviceId, back: chosenBack?.deviceId };
  } catch {
    // MindAR will request the camera itself; this probe only resolves camera IDs when possible.
    return {};
  } finally {
    probe?.getTracks().forEach((track) => track.stop());
  }
}

function prepareModel(scene: THREE.Group): THREE.Group {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z, 0.001);
  scene.position.sub(center);

  const root = new THREE.Group();
  root.add(scene);
  const baseScale = 0.46 / largestDimension;
  root.scale.setScalar(baseScale);
  root.position.set(0, 0, 0.08);
  root.userData.baseScale = baseScale;
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.frustumCulled = true;
      node.castShadow = true;
    }
  });
  return root;
}

async function showInstrument(instrument: Instrument, anchor: ReturnType<MindARThree['addAnchor']>): Promise<void> {
  if (models.has(instrument.id)) {
    if (!anchor.group.children.includes(models.get(instrument.id)!)) anchor.group.add(models.get(instrument.id)!);
    return;
  }
  loadingModel.value = true;
  try {
    const gltf = await loader.loadAsync(instrument.model);
    const root = prepareModel(gltf.scene);
    models.set(instrument.id, root);
    modelBaseScales.set(instrument.id, root.userData.baseScale as number);
    anchor.group.add(root);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'model 3D gagal dimuat';
    error.value = `Model ${instrument.name} tidak dapat dimuat: ${message}`;
    status.value = 'Periksa file model dan koneksi aset.';
  } finally {
    loadingModel.value = false;
  }
}

function cleanupMindARRuntime(instance: MindARThree): void {
  const internals = instance as unknown as {
    video?: HTMLVideoElement;
    cssRenderer?: { domElement: HTMLElement };
    controller?: { stopProcessVideo?: () => void };
  };
  const cameraVideo = internals.video;
  const mediaStream = cameraVideo?.srcObject as MediaStream | null;

  try { instance.renderer.setAnimationLoop(null); } catch { /* renderer may already be disposed */ }
  try { instance.stop(); } catch {
    // MindAR.stop can throw when shutdown races its pending getUserMedia call.
  }

  // Always release the physical camera independently of MindAR's cleanup path.
  // This also handles the case where permission resolves after the page changed.
  mediaStream?.getTracks().forEach((track) => {
    try { track.stop(); } catch { /* track may already be ended */ }
  });
  try { internals.controller?.stopProcessVideo?.(); } catch { /* controller may already be closed */ }

  if (cameraVideo) {
    try { cameraVideo.pause(); } catch { /* no-op */ }
    cameraVideo.srcObject = null;
    cameraVideo.remove();
  }
  internals.cssRenderer?.domElement.remove();
  try { instance.renderer.dispose(); } catch { /* no-op */ }
  instance.renderer.domElement.remove();
}

async function start(): Promise<void> {
  if (!stage.value || starting || running) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = 'Browser ini tidak mendukung kamera. Buka aplikasi melalui HTTPS atau localhost.';
    return;
  }

  const generation = ++startGeneration;
  const isCurrentStart = () => generation === startGeneration && props.cameraEnabled && !!stage.value;
  let activeRuntime: MindARThree | null = null;
  starting = true;
  error.value = '';
  status.value = 'Menyiapkan kamera belakang…';

  try {
    const cameras = await inspectCameras();
    if (!isCurrentStart()) return;

    activeRuntime = new MindARThree({
      container: stage.value,
      imageTargetSrc: '/assets/targets/musikantara.mind',
      maxTrack: 1,
      filterMinCF: 0.0005,
      filterBeta: 10,
      warmupTolerance: 5,
      missTolerance: 5,
      userDeviceId: cameras.front,
      environmentDeviceId: cameras.back,
      // Musikantara owns the complete UI. MindAR's page-level overlays are off.
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no'
    });
    runtime = activeRuntime;

    // MindAR 1.2.x does not expose an AbortSignal for getUserMedia. Wrap its
    // private video-start step so a permission response arriving after the
    // user leaves Scan AR is stopped before MindAR begins target processing.
    const runtimeInternals = activeRuntime as unknown as {
      _startVideo: () => Promise<void>;
      video?: HTMLVideoElement;
    };
    const originalStartVideo = runtimeInternals._startVideo.bind(activeRuntime);
    runtimeInternals._startVideo = async () => {
      await originalStartVideo();
      if (!isCurrentStart()) {
        const lateStream = runtimeInternals.video?.srcObject as MediaStream | null;
        lateStream?.getTracks().forEach((track) => {
          try { track.stop(); } catch { /* no-op */ }
        });
        if (runtimeInternals.video) {
          try { runtimeInternals.video.pause(); } catch { /* no-op */ }
          runtimeInternals.video.srcObject = null;
        }
        throw new Error('AR camera startup cancelled because the Scan AR page was closed.');
      }
    };

    activeRuntime.renderer.domElement.classList.add('mindar-webgl-layer');
    const cssRendererLayer = (activeRuntime as unknown as {
      cssRenderer?: { domElement: HTMLElement }
    }).cssRenderer?.domElement;
    if (cssRendererLayer) {
      cssRendererLayer.classList.add('mindar-css-layer');
      cssRendererLayer.style.pointerEvents = 'none';
    }

    // GLTF files use physically based materials. Add real scene lighting.
    const hemisphereLight = new THREE.HemisphereLight(0xfff4e5, 0x5d584d, 2.0);
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(2.5, 4.0, 3.5);
    const fillLight = new THREE.DirectionalLight(0xffd8a8, 1.25);
    fillLight.position.set(-3.0, 1.5, -2.5);
    activeRuntime.scene.add(hemisphereLight, ambientLight, keyLight, fillLight);
    activeRuntime.scene.background = null;
    activeRuntime.renderer.outputColorSpace = THREE.SRGBColorSpace;
    activeRuntime.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    activeRuntime.renderer.toneMappingExposure = 1.25;
    activeRuntime.renderer.setClearColor(0x000000, 0);

    for (const instrument of INSTRUMENTS) {
      const anchor = activeRuntime.addAnchor(instrument.targetIndex);
      anchor.onTargetFound = () => {
        detectedId.value = instrument.id;
        emit('detected', instrument.id);
        status.value = `${instrument.name} terdeteksi`;
        gestureController.reset();
        void showInstrument(instrument, anchor);
      };
      anchor.onTargetLost = () => {
        if (detectedId.value === instrument.id) {
          detectedId.value = null;
          emit('detected', null);
          status.value = 'Arahkan kamera ke salah satu kartu AR';
          gestureController.reset();
        }
      };
    }

    await activeRuntime.start();
    if (!isCurrentStart()) {
      cleanupMindARRuntime(activeRuntime);
      if (runtime === activeRuntime) runtime = null;
      return;
    }

    const cameraVideo = (activeRuntime as unknown as { video?: HTMLVideoElement }).video;
    if (cameraVideo) {
      cameraVideo.classList.add('mindar-camera-video');
      cameraVideo.style.setProperty('z-index', '0', 'important');
      cameraVideo.style.setProperty('pointer-events', 'none', 'important');
      cameraVideo.muted = true;
      cameraVideo.playsInline = true;
    }
    activeRuntime.renderer.setAnimationLoop(() => {
      if (runtime === activeRuntime) activeRuntime!.renderer.render(activeRuntime!.scene, activeRuntime!.camera);
    });
    running = true;
    status.value = 'Arahkan kamera ke kartu alat musik';
  } catch (cause) {
    if (activeRuntime) cleanupMindARRuntime(activeRuntime);
    if (runtime === activeRuntime) runtime = null;
    if (generation !== startGeneration) return;
    const name = cause instanceof Error ? cause.name : '';
    const message = cause instanceof Error ? cause.message : 'kamera tidak dapat diaktifkan';
    error.value = name === 'NotAllowedError'
      ? 'Izin kamera ditolak. Aktifkan izin kamera pada pengaturan browser, lalu coba lagi.'
      : `Kamera AR tidak dapat dijalankan: ${message}`;
    status.value = 'Kamera belum aktif';
    running = false;
  } finally {
    if (generation === startGeneration) starting = false;
  }
}

function stop(): void {
  // Invalidate any pending start. Its continuation will clean up again if the
  // browser grants the camera after the Scan AR component has been left.
  startGeneration += 1;
  starting = false;
  const activeRuntime = runtime;
  runtime = null;
  if (activeRuntime) cleanupMindARRuntime(activeRuntime);

  // Defensive sweep for any video stream still attached to this AR stage.
  stage.value?.querySelectorAll('video').forEach((element) => {
    const mediaStream = element.srcObject as MediaStream | null;
    mediaStream?.getTracks().forEach((track) => {
      try { track.stop(); } catch { /* no-op */ }
    });
    try { element.pause(); } catch { /* no-op */ }
    element.srcObject = null;
    element.remove();
  });
  stage.value?.querySelectorAll('canvas').forEach((element) => element.remove());

  running = false;
  for (const root of models.values()) {
    root.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }
  models.clear();
  modelBaseScales.clear();
  pointerMap.clear();
  detectedId.value = null;
  emit('detected', null);
  gestureController.reset();
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
  }
}

function clampScale(root: THREE.Group, factor: number): void {
  const base = modelBaseScales.get(detectedId.value ?? '') ?? (root.userData.baseScale as number) ?? root.scale.x;
  const next = Math.max(base * 0.35, Math.min(base * 2.7, root.scale.x * factor));
  root.scale.setScalar(next);
}

function onPointerDown(event: PointerEvent): void {
  if (props.gestureEnabled || !activeModelRoot()) return;
  pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });
  pointerButton = event.button;
  if (pointerMap.size === 2) {
    const points = [...pointerMap.values()];
    lastPinchDistance = Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y);
    lastPinchAngle = Math.atan2(points[1]!.y - points[0]!.y, points[1]!.x - points[0]!.x);
    lastPinchCenter = { x: (points[0]!.x + points[1]!.x) / 2, y: (points[0]!.y + points[1]!.y) / 2 };
  }
  try { stage.value?.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
}

function onPointerMove(event: PointerEvent): void {
  const root = activeModelRoot();
  if (!root || props.gestureEnabled || !pointerMap.has(event.pointerId)) return;
  const previous = pointerMap.get(event.pointerId)!;
  pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const sensitivity = props.viewerSensitivity;

  if (pointerMap.size >= 2) {
    const points = [...pointerMap.values()];
    const distanceNow = Math.max(8, Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y));
    const angleNow = Math.atan2(points[1]!.y - points[0]!.y, points[1]!.x - points[0]!.x);
    const centerNow = { x: (points[0]!.x + points[1]!.x) / 2, y: (points[0]!.y + points[1]!.y) / 2 };
    clampScale(root, Math.max(0.94, Math.min(1.06, distanceNow / Math.max(8, lastPinchDistance))));
    root.rotation.z += angleNow - lastPinchAngle;
    root.position.x += (centerNow.x - lastPinchCenter.x) * 0.0022 * sensitivity;
    root.position.y -= (centerNow.y - lastPinchCenter.y) * 0.0022 * sensitivity;
    lastPinchDistance = distanceNow;
    lastPinchAngle = angleNow;
    lastPinchCenter = centerNow;
    return;
  }

  const dx = event.clientX - previous.x;
  const dy = event.clientY - previous.y;
  if (pointerButton === 2 || controlMode.value === 'move') {
    root.position.x += dx * 0.0024 * sensitivity;
    root.position.y -= dy * 0.0024 * sensitivity;
  } else if (controlMode.value === 'scale') {
    clampScale(root, Math.exp(-dy * 0.006 * sensitivity));
  } else {
    root.rotation.y += dx * 0.008 * sensitivity;
    root.rotation.x += dy * 0.008 * sensitivity;
  }
}

function onPointerUp(event: PointerEvent): void {
  pointerMap.delete(event.pointerId);
}

function onWheel(event: WheelEvent): void {
  const root = activeModelRoot();
  if (!root || props.gestureEnabled) return;
  event.preventDefault();
  clampScale(root, Math.exp(-event.deltaY * 0.0012 * props.viewerSensitivity));
}

function activeModelRoot(): THREE.Group | null {
  return detectedId.value ? models.get(detectedId.value) ?? null : null;
}

function onContextMenu(event: Event): void {
  event.preventDefault();
}

function resetModel(): void {
  const root = activeModelRoot();
  if (!root) return;
  root.position.set(0, 0, 0.08);
  root.rotation.set(0, 0, 0);
  const base = modelBaseScales.get(detectedId.value ?? '') ?? 0.4;
  root.scale.setScalar(base);
  gestureController.reset();
}

function playInstrumentSound(): void {
  if (!activeInstrument.value) return;
  audio?.pause();
  audio = new Audio(activeInstrument.value.audio);
  audio.currentTime = 0;
  void audio.play().catch(() => {
    error.value = 'Audio tidak dapat diputar. Coba ketuk tombol suara sekali lagi.';
  });
}

watch(() => props.cameraEnabled, (enabled) => {
  if (enabled) void start();
  else void stop();
});
onMounted(() => {
  if (props.cameraEnabled) void start();
});

watch(() => props.gesture, (frame) => {
  const root = activeModelRoot();
  if (!frame || !root || !props.gestureEnabled) {
    if (!frame) gestureController.reset();
    return;
  }
  gestureController.apply(root, frame, props.gestureSensitivity);
});
watch(() => props.gestureSensitivity, () => gestureController.reset());
watch(() => props.gestureEnabled, () => gestureController.reset());

onBeforeUnmount(() => {
  void stop();
  audio?.pause();
});
</script>

<template>
  <section class="scan-view">
    <div
      ref="stage"
      class="camera-stage"
      :class="{ 'camera-stage--active': cameraEnabled }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
      @contextmenu="onContextMenu"
    >
      <div v-if="!cameraEnabled" class="camera-empty">
        <button class="scan-back scan-back--empty" @click="emit('exit')">← Kembali</button>
        <div class="camera-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 7.5h3l1.5-2h7l1.5 2h3A1.5 1.5 0 0 1 21.5 9v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z"/><circle cx="12" cy="13.5" r="3.5"/></svg>
        </div>
        <h2>Scan kartu alat musik</h2>
        <p>Aktifkan kamera belakang, lalu arahkan ke kartu AR.</p>
        <button class="primary-button" @click="emit('toggleCamera')">Aktifkan kamera</button>
      </div>

      <div v-if="cameraEnabled" class="scan-topline">
        <button class="scan-back" @pointerdown.stop @click.stop="emit('exit')" aria-label="Kembali ke menu">←</button>
        <span class="scan-status-dot" :class="{ 'scan-status-dot--loading': loadingModel }"></span>
        <span>{{ status }}</span>
      </div>
      <div v-if="gestureEnabled" class="scan-sensor-status" @pointerdown.stop>{{ sensorStatus }}</div>

      <div v-if="cameraEnabled && error" class="scan-error" role="alert">{{ error }}</div>

      <div v-if="cameraEnabled" class="scan-toolbar" @pointerdown.stop>
        <div class="scan-tools" :class="{ 'scan-tools--disabled': gestureEnabled }">
          <button :class="{ active: controlMode === 'rotate' }" :disabled="gestureEnabled" title="Putar model" @click.stop="controlMode = 'rotate'">Putar</button>
          <button :class="{ active: controlMode === 'move' }" :disabled="gestureEnabled" title="Geser model" @click.stop="controlMode = 'move'">Geser</button>
          <button :class="{ active: controlMode === 'scale' }" :disabled="gestureEnabled" title="Atur ukuran" @click.stop="controlMode = 'scale'">Skala</button>
        </div>
        <div class="scan-actions">
          <button class="tool-icon" :class="{ active: gestureEnabled }" :title="gestureEnabled ? 'Matikan kontrol gestur' : 'Nyalakan kontrol gestur'" @click.stop="emit('toggleGesture')">
            <svg viewBox="0 0 24 24"><path d="M7.5 11.5V6a1.5 1.5 0 0 1 3 0v4.5-5a1.5 1.5 0 0 1 3 0v5-3a1.5 1.5 0 0 1 3 0v5.2l.8-1a1.6 1.6 0 0 1 2.7 1l-.5 4.2a6 6 0 0 1-6 5.1h-1.2a6 6 0 0 1-4.6-2.2l-3.2-3.8a1.7 1.7 0 0 1 2.5-2.3l1.5 1.4"/></svg>
          </button>
          <button class="tool-icon" title="Atur ulang model" :disabled="!detectedId" @click.stop="resetModel">
            <svg viewBox="0 0 24 24"><path d="M4 11a8 8 0 1 1 2.2 5.5M4 5v6h6"/></svg>
          </button>
          <button class="tool-icon" title="Matikan kamera" @click.stop="emit('toggleCamera')">
            <svg viewBox="0 0 24 24"><path d="M3 7.5h4l1.5-2h7L17 7.5h1.5A2 2 0 0 1 20.5 9v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V9a2 2 0 0 1 2-1.5Z"/><path d="m3 3 18 18"/></svg>
          </button>
        </div>
      </div>

      <div v-if="cameraEnabled && activeInstrument" class="detected-card" @pointerdown.stop>
        <div class="detected-copy">
          <strong>{{ activeInstrument.name }}</strong>
          <span>{{ activeInstrument.region }}</span>
        </div>
        <button class="sound-button" title="Putar suara alat musik" @click.stop="playInstrumentSound">
          <svg viewBox="0 0 24 24"><path d="M4 10v4h3l4 3V7l-4 3H4Z"/><path d="M15 9.5a5 5 0 0 1 0 5M17.5 7a8.5 8.5 0 0 1 0 10"/></svg>
          Suara
        </button>
        <button class="detail-button" @click.stop="emit('openDetail', activeInstrument.id)">Selengkapnya</button>
      </div>

      <div v-else-if="cameraEnabled && !error" class="scan-hint" @pointerdown.stop>
        <span>{{ gestureEnabled ? 'Gerakkan tangan di depan kamera sensor' : 'Tampilkan kartu di depan kamera' }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.scan-view,
.camera-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #171a16;
}
.camera-stage {
  touch-action: none;
  isolation: isolate;
}
/* MindAR positions and sizes its video in resize(). Keep those inline geometry
   values intact; only lift the video above the stage background. */
.camera-stage :deep(video.mindar-camera-video),
.camera-stage :deep(video) {
  position: absolute !important;
  z-index: 0 !important;
  display: block !important;
  max-width: none !important;
  object-fit: cover !important;
  pointer-events: none !important;
}
/* The WebGL canvas is transparent and sits above the real camera feed. */
.camera-stage :deep(canvas.mindar-webgl-layer),
.camera-stage :deep(canvas) {
  position: absolute !important;
  z-index: 1 !important;
  display: block !important;
  pointer-events: none !important;
}
/* CSS3D renderer is unused by Musikantara; it must never capture input. */
.camera-stage :deep(.mindar-css-layer) {
  z-index: 2 !important;
  pointer-events: none !important;
}
/* Defensive fallback: if MindAR ever adds an overlay, it cannot block controls. */
:global(.mindar-ui-overlay) {
  pointer-events: none !important;
}
.camera-empty {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 2rem;
  color: #f5f1e8;
  text-align: center;
  background: radial-gradient(circle at 50% 40%, #35483a, #171a16 68%);
}
.camera-empty h2 { margin: 0.3rem 0 0; font-size: 1.35rem; }
.camera-empty p { max-width: 28rem; margin: 0 0 0.7rem; color: #d1d5cd; font-size: 0.85rem; }
.camera-empty-icon { display: grid; place-items: center; width: 4rem; height: 4rem; border: 1px solid #81917f; border-radius: 50%; }
.camera-empty-icon svg { width: 1.8rem; fill: none; stroke: currentColor; stroke-width: 1.5; }
.primary-button { border: 0; border-radius: 999px; padding: 0.82rem 1.35rem; color: #19372d; background: #e6b66e; font: inherit; font-weight: 800; cursor: pointer; }
.scan-back { border: 0; padding: 0.1rem 0.4rem; color: #fff; background: transparent; font: inherit; font-size: 1.05rem; cursor: pointer; }
.scan-back--empty { position: absolute; top: 1.2rem; left: 1.2rem; font-size: 0.78rem; }
.scan-sensor-status { position: absolute; z-index: 5; top: max(4rem, calc(env(safe-area-inset-top) + 3rem)); left: 1rem; max-width: min(70%, 28rem); border-radius: 999px; padding: 0.42rem 0.7rem; color: #f4f1e9; background: #111a16a8; font-size: 0.62rem; backdrop-filter: blur(12px); }
.scan-topline { position: absolute; z-index: 5; top: max(1.1rem, env(safe-area-inset-top)); left: 1rem; display: flex; align-items: center; gap: 0.55rem; max-width: min(68%, 32rem); border-radius: 999px; padding: 0.55rem 0.85rem; color: #fff; background: #111a16b8; font-size: 0.75rem; backdrop-filter: blur(16px); }
.scan-status-dot { width: 0.48rem; height: 0.48rem; flex: 0 0 auto; border-radius: 50%; background: #8bc58c; }
.scan-status-dot--loading { background: #e9b767; animation: pulse 0.9s infinite alternate; }
.scan-toolbar { position: absolute; z-index: 6; bottom: max(1.1rem, env(safe-area-inset-bottom)); left: 50%; display: flex; align-items: center; gap: 0.7rem; max-width: calc(100% - 1.5rem); transform: translateX(-50%); border: 1px solid #ffffff28; border-radius: 999px; padding: 0.45rem; color: #fff; background: #141c18d9; backdrop-filter: blur(18px); }
.scan-tools, .scan-actions { display: flex; align-items: center; gap: 0.2rem; }
.scan-tools button { border: 0; border-radius: 999px; padding: 0.6rem 0.78rem; color: #d7ddd6; background: transparent; font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; }
.scan-tools button.active { color: #18392e; background: #e2b46d; }
.scan-tools button:disabled { opacity: 0.38; cursor: not-allowed; }
.tool-icon { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border: 0; border-radius: 50%; color: #fff; background: transparent; cursor: pointer; }
.tool-icon.active { color: #1b392e; background: #e2b46d; }
.tool-icon:disabled { opacity: 0.32; }
.tool-icon svg, .sound-button svg { width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 1.65; stroke-linecap: round; stroke-linejoin: round; }
.scan-error { position: absolute; z-index: 7; top: 4.6rem; left: 1rem; right: 1rem; max-width: 44rem; margin: auto; border-radius: 0.8rem; padding: 0.8rem 1rem; color: #fff0ea; background: #743c32e8; font-size: 0.78rem; }
.scan-hint { position: absolute; z-index: 5; bottom: 5.4rem; left: 50%; transform: translateX(-50%); border-radius: 999px; padding: 0.55rem 0.85rem; color: #fff; background: #111a16b8; font-size: 0.72rem; white-space: nowrap; backdrop-filter: blur(16px); }
.detected-card { position: absolute; z-index: 6; top: max(4.4rem, calc(env(safe-area-inset-top) + 3.2rem)); left: 50%; display: flex; align-items: center; gap: 0.6rem; max-width: calc(100% - 1.5rem); border: 1px solid #ffffff24; border-radius: 1rem; padding: 0.65rem 0.75rem; color: #fff; background: #141c18d9; transform: translateX(-50%); backdrop-filter: blur(18px); }
.detected-copy { display: flex; flex-direction: column; min-width: 6rem; gap: 0.15rem; }
.detected-copy strong { font-size: 0.84rem; }
.detected-copy span { color: #c4c9c1; font-size: 0.68rem; }
.sound-button, .detail-button { display: flex; align-items: center; gap: 0.35rem; border: 0; border-radius: 999px; padding: 0.58rem 0.72rem; color: #1c392f; background: #e2b46d; font: inherit; font-size: 0.7rem; font-weight: 800; white-space: nowrap; cursor: pointer; }
.detail-button { color: #f7f2e7; background: #ffffff24; }
@keyframes pulse { from { opacity: 0.5; } to { opacity: 1; } }
@media (max-width: 640px) {
  .scan-toolbar { bottom: max(0.65rem, env(safe-area-inset-bottom)); gap: 0.25rem; padding: 0.28rem; }
  .scan-tools button { padding: 0.55rem 0.58rem; font-size: 0.66rem; }
  .tool-icon { width: 2.15rem; height: 2.15rem; }
  .detected-card { top: max(3.7rem, calc(env(safe-area-inset-top) + 2.6rem)); gap: 0.35rem; padding: 0.55rem; }
  .detected-copy { min-width: 4.4rem; }
  .sound-button, .detail-button { padding: 0.52rem 0.6rem; font-size: 0.64rem; }
  .scan-hint { bottom: 4.6rem; max-width: calc(100% - 2rem); font-size: 0.66rem; }
}
</style>
