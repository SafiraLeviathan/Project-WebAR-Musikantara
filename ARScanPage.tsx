import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import type { InstrumentRecord, CalibrationSettings } from '../types/app';
import { applyGestureTransform } from '../features/gestures/transform';
import { useHandTracking } from '../hooks/useHandTracking';
import { Icon } from '../components/Icon';

interface ARScanPageProps {
  instruments: InstrumentRecord[];
  settings: CalibrationSettings;
  preferredInstrumentId: string | null;
  onOpenInstrument: (instrument: InstrumentRecord) => void;
}

type ScanState = 'off' | 'starting' | 'ready' | 'error';

function normalizeModel(model: THREE.Object3D): THREE.Group {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z) || 1;
  const content = new THREE.Group();
  model.position.sub(center);
  model.scale.setScalar(0.72 / largest);
  content.add(model);
  return content;
}


export function ARScanPage({ instruments, settings, preferredInstrumentId, onOpenInstrument }: ARScanPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThree | null>(null);
  const modelRootsRef = useRef<Map<string, THREE.Group>>(new Map());
  const activeRootRef = useRef<THREE.Group | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [scanState, setScanState] = useState<ScanState>('off');
  const [cameraVideo, setCameraVideo] = useState<HTMLVideoElement | null>(null);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [soundMessage, setSoundMessage] = useState('');
  const detected = instruments.find((item) => item.id === detectedId) ?? null;
  const gesture = useHandTracking(cameraVideo, gestureEnabled && scanState === 'ready', settings, (delta) => activeRootRef.current && applyGestureTransform(activeRootRef.current, delta));

  const stopScan = useCallback(() => {
    const mindar = mindarRef.current;
    if (mindar) {
      try { mindar.renderer.setAnimationLoop(null); } catch { /* Renderer may not have started. */ }
      try { mindar.stop(); } catch { /* A failed camera request may leave no video stream. */ }
      try { mindar.controller?.dispose(); } catch { /* Worker may already be disposed. */ }
      try { mindar.renderer.dispose(); } catch { /* Renderer may already be disposed. */ }
      const container = containerRef.current;
      container?.querySelectorAll('canvas, video').forEach((element) => element.remove());
      mindarRef.current = null;
    }
    audioRef.current?.pause();
    audioRef.current = null;
    modelRootsRef.current.clear();
    activeRootRef.current = null;
    activeIdRef.current = null;
    setCameraVideo(null);
    setDetectedId(null);
    setLoadingModelId(null);
    setGestureEnabled(false);
    setScanState('off');
  }, []);

  const startScan = useCallback(async () => {
    if (!containerRef.current || scanState === 'starting' || scanState === 'ready') return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Kamera membutuhkan localhost atau alamat HTTPS. Buka Musikantara melalui localhost untuk pengujian lokal.');
      setScanState('error');
      return;
    }
    setErrorMessage('');
    setScanState('starting');
    try {
      const mindar = new MindARThree({
        container: containerRef.current,
        imageTargetSrc: '/assets/targets/musikantara.mind',
        maxTrack: 1,
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
        filterMinCF: 0.001,
        filterBeta: 1000,
      });
      mindarRef.current = mindar;
      mindar.shouldFaceUser = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      mindar.renderer.setClearColor(0x000000, 0);
      mindar.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      mindar.scene.add(new THREE.HemisphereLight(0xffffff, 0xc7b6a3, 2.1));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(1, 4, 4);
      mindar.scene.add(keyLight);
      mindar.renderer.setAnimationLoop(() => mindar.renderer.render(mindar.scene, mindar.camera));

      const loader = new GLTFLoader();
      const loadFor = (instrument: InstrumentRecord, anchor: ReturnType<MindARThree['addAnchor']>) => {
        if (modelRootsRef.current.has(instrument.id)) return;
        const transformRoot = new THREE.Group();
        transformRoot.scale.setScalar(1);
        modelRootsRef.current.set(instrument.id, transformRoot);
        anchor.group.add(transformRoot);
        if (activeIdRef.current === instrument.id) activeRootRef.current = transformRoot;
        setLoadingModelId(instrument.id);
        loader.load(instrument.model, (gltf) => {
          const activeTransform = modelRootsRef.current.get(instrument.id);
          if (!activeTransform) return;
          activeTransform.add(normalizeModel(gltf.scene));
          setLoadingModelId((current) => current === instrument.id ? null : current);
        }, undefined, (error) => {
          console.error(`Gagal memuat model ${instrument.name}`, error);
          setLoadingModelId(null);
          setErrorMessage(`Model 3D ${instrument.name} gagal dimuat. Periksa file assets/asset_3d/${instrument.name}.glb.`);
        });
      };

      instruments.forEach((instrument) => {
        const anchor = mindar.addAnchor(instrument.arTargetIndex);
        anchor.onTargetFound = () => {
          activeIdRef.current = instrument.id;
          activeRootRef.current = modelRootsRef.current.get(instrument.id) ?? null;
          setDetectedId(instrument.id);
          loadFor(instrument, anchor);
        };
        anchor.onTargetLost = () => {
          if (activeIdRef.current === instrument.id) {
            activeIdRef.current = null;
            activeRootRef.current = null;
            setDetectedId(null);
          }
        };
      });

      await mindar.start();
      if (mindarRef.current !== mindar) {
        try { mindar.stop(); } catch { /* Camera was cancelled while starting. */ }
        try { mindar.controller.dispose(); } catch { /* No active worker remains. */ }
        try { mindar.renderer.dispose(); } catch { /* Renderer was already released. */ }
        return;
      }
      setCameraVideo(mindar.video);
      setScanState('ready');
    } catch (error) {
      console.error('MindAR start failed:', error);
      const name = error instanceof DOMException ? error.name : '';
      setErrorMessage(name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Aktifkan kamera untuk situs ini melalui pengaturan browser.'
        : 'Kamera atau pelacak AR gagal dimulai. Pastikan kamera tidak sedang digunakan aplikasi lain.');
      stopScan();
      setScanState('error');
    }
  }, [instruments, scanState, stopScan]);

  useEffect(() => () => stopScan(), [stopScan]);

  const toggleGesture = () => {
    if (!cameraVideo) return;
    setGestureEnabled((current) => !current);
  };

  const playDetectedSound = async () => {
    if (!detected) return;
    audioRef.current?.pause();
    const audio = new Audio(detected.sound);
    audioRef.current = audio;
    audio.addEventListener('ended', () => setSoundMessage(''), { once: true });
    audio.addEventListener('error', () => setSoundMessage('File suara tidak dapat diputar.'), { once: true });
    try {
      await audio.play();
      setSoundMessage(`Memutar suara ${detected.name}`);
    } catch {
      setSoundMessage('Browser tidak dapat memutar file suara ini.');
    }
  };

  return (
    <div className="page ar-page">
      <div className="page-intro ar-intro">
        <div><span className="eyebrow">AUGMENTED REALITY</span><h1>AR Scan</h1><p>Pindai salah satu dari lima kartu untuk melihat model instrumen dalam ruang nyata.</p></div>
        <button className={`camera-toggle ${scanState === 'ready' ? 'is-on' : ''}`} onClick={scanState === 'ready' || scanState === 'starting' ? stopScan : () => void startScan()}>
          <Icon name="camera" size={18} /> {scanState === 'ready' ? 'Matikan kamera' : scanState === 'starting' ? 'Menyiapkan…' : 'Nyalakan kamera'}
        </button>
      </div>

      <div className="ar-layout">
        <section className="ar-camera-panel">
          <div className="ar-camera-label"><span className="live-dot" /> {scanState === 'ready' ? 'KAMERA AKTIF' : scanState === 'starting' ? 'MENYIAPKAN KAMERA' : 'AREA PEMINDAIAN'}</div>
          <div className="ar-viewport" ref={containerRef}>
            {scanState !== 'ready' && (
              <div className="camera-placeholder">
                <span className="camera-placeholder-icon"><Icon name="scan" size={34} /></span>
                <strong>{scanState === 'starting' ? 'Mengaktifkan kamera…' : 'Mulai pemindaian AR'}</strong>
                <p>{scanState === 'error' ? errorMessage : 'Izinkan akses kamera, lalu arahkan ke salah satu kartu alat musik.'}</p>
                {scanState !== 'starting' && <button className="button button-primary" onClick={() => void startScan()}>Mulai kamera</button>}
              </div>
            )}
            {scanState === 'ready' && !detected && <div className="scan-guide"><span className="scan-corner scan-top-left" /><span className="scan-corner scan-top-right" /><span className="scan-corner scan-bottom-left" /><span className="scan-corner scan-bottom-right" /><span>Posisikan kartu di dalam area kamera</span></div>}
          </div>
          <div className="ar-camera-footer"><span>{scanState === 'ready' ? 'Pelacakan gambar MindAR berjalan' : 'Kamera dimatikan untuk menghemat daya'}</span><span>5 TARGET TERDAFTAR</span></div>
        </section>

        <aside className="ar-side-panel">
          <div className="ar-identification">
            <span className="eyebrow">HASIL IDENTIFIKASI</span>
            {detected ? (
              <>
                <div className="detected-art"><img src={detected.image} alt={detected.name} /></div>
                <span className="detected-region">{detected.region.toUpperCase()} · TARGET {detected.arTargetIndex}</span>
                <h2>{detected.name}</h2>
                <p>{detected.summary}</p>
                {loadingModelId === detected.id && <span className="model-loading">Memuat model 3D…</span>}
                <div className="detected-actions">
                  <button className="button button-primary button-wide" onClick={() => void playDetectedSound()}><Icon name="volume" size={17} /> Putar suara</button>
                  <button className="button button-secondary button-wide" onClick={() => onOpenInstrument(detected)}><Icon name="info" size={17} /> Detail instrumen</button>
                </div>
                {soundMessage && <small className="inline-status">{soundMessage}</small>}
              </>
            ) : (
              <div className="identification-empty"><div className="empty-orbit"><Icon name="scan" size={28} /></div><strong>Belum ada kartu terdeteksi</strong><p>Ketika kartu dikenali, nama instrumen dan model 3D akan muncul di sini.</p></div>
            )}
          </div>
          <div className="gesture-control-card">
            <div className="gesture-control-heading"><span><Icon name="hand" size={18} /> Kontrol gestur tangan</span><span className={`state-pill ${gestureEnabled ? 'state-active' : ''}`}>{gestureEnabled ? 'ON' : 'OFF'}</span></div>
            <p>Putar, miringkan, dan ubah ukuran model dengan gerakan tangan.</p>
            <button className={`gesture-switch ${gestureEnabled ? 'is-active' : ''}`} onClick={toggleGesture} disabled={scanState !== 'ready'} aria-pressed={gestureEnabled}><span /></button>
            <span className="inline-status">{gesture.message}</span>
            {gestureEnabled && <div className="gesture-hint">Geser tangan: rotasi · Gerak naik/turun: kemiringan · Cubit: skala</div>}
          </div>
          {preferredInstrumentId && <div className="preferred-target-note">Kartu pilihan dari detail: <strong>{instruments.find((item) => item.id === preferredInstrumentId)?.name ?? 'Instrumen'}</strong>. Semua kartu tetap dikenali.</div>}
        </aside>
      </div>
      <div className="ar-target-strip">
        <span className="eyebrow">KARTU YANG DIDUKUNG</span>
        {instruments.map((instrument) => <span className={`target-chip ${detectedId === instrument.id ? 'is-detected' : ''}`} key={instrument.id}>{instrument.name}</span>)}
      </div>
    </div>
  );
}
