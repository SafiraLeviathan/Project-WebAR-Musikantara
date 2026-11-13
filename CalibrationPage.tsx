import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { Icon } from '../components/Icon';
import { ThreeViewport } from '../components/ThreeViewport';
import { useHiddenCamera } from '../hooks/useHiddenCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import type { CalibrationSettings } from '../types/app';
import { applyGestureTransform } from '../features/gestures/transform';

interface CalibrationPageProps {
  settings: CalibrationSettings;
  onUpdate: (patch: Partial<CalibrationSettings>) => void;
  onSave: () => boolean;
  onReset: () => void;
}


interface SliderControlProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function SliderControl({ label, description, value, min, max, step, suffix = '×', onChange }: SliderControlProps) {
  return (
    <label className="slider-control">
      <span className="slider-copy"><strong>{label}</strong><small>{description}</small></span>
      <span className="slider-value">{value.toFixed(2)}{suffix}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  );
}

export function CalibrationPage({ settings, onUpdate, onSave, onReset }: CalibrationPageProps) {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [notice, setNotice] = useState('');
  const dummyRef = useRef<THREE.Group | null>(null);
  const camera = useHiddenCamera(cameraEnabled);
  const hand = useHandTracking(camera.video, cameraEnabled && camera.status === 'ready', settings, useCallback((delta) => dummyRef.current && applyGestureTransform(dummyRef.current, delta), []));

  const save = () => {
    const saved = onSave();
    setNotice(saved ? 'Pengaturan tersimpan untuk sesi aplikasi ini.' : 'Penyimpanan sesi tidak tersedia. Pengaturan tetap aktif sampai halaman ditutup.');
  };

  const reset = () => {
    onReset();
    setNotice('Semua sensitivitas dikembalikan ke nilai awal.');
  };

  return (
    <div className="page calibration-page">
      <div className="page-intro calibration-intro">
        <div><span className="eyebrow">KENDALI INTERAKTIF</span><h1>Kalibrasi gestur tangan</h1><p>Atur respons gerakan tangan dan uji langsung pada model dummy 3D.</p></div>
        <div className={`tracking-status tracking-${hand.status}`}><span className="live-dot" /> {hand.status === 'ready' ? 'TRACKING AKTIF' : hand.status === 'loading' ? 'MEMUAT MODEL' : hand.status === 'not-found' ? 'TANGAN BELUM TERLIHAT' : hand.status === 'error' ? 'TRACKING ERROR' : 'TRACKING NONAKTIF'}</div>
      </div>

      <div className="calibration-layout">
        <section className="dummy-panel">
          <div className="panel-heading"><div><span className="eyebrow">PRATINJAU 3D</span><h2>Model dummy</h2></div><span className="dummy-tag">LIVE PREVIEW</span></div>
          <div className="dummy-stage"><ThreeViewport dummy className="dummy-viewport" onObjectReady={(object) => { dummyRef.current = object; }} /></div>
          <div className="dummy-footer"><span><span className="live-dot" /> {camera.status === 'ready' ? 'Kamera tersembunyi aktif' : camera.message}</span><span>VIDEO TIDAK DITAMPILKAN</span></div>
          <div className="camera-controls">
            <button className={`button ${cameraEnabled ? 'button-secondary' : 'button-primary'}`} onClick={() => setCameraEnabled((current) => !current)}>
              <Icon name="camera" size={17} /> {cameraEnabled ? 'Matikan kamera' : 'Aktifkan kamera'}
            </button>
            <span className="camera-help">Kamera hanya menjadi sumber pelacakan. Tidak ada pratinjau video di menu ini.</span>
          </div>
          {cameraEnabled && <p className={`tracking-message tracking-${hand.status}`}>{camera.status === 'ready' ? hand.message : camera.message}</p>}
        </section>

        <section className="calibration-controls-panel">
          <div className="panel-heading"><div><span className="eyebrow">PENYESUAIAN RESPONS</span><h2>Atur sensitivitas</h2></div></div>
          <div className="sliders-list">
            <SliderControl label="Rotasi horizontal" description="Kecepatan putaran model ke kiri dan kanan" value={settings.rotationSensitivity} min={0.2} max={2.5} step={0.05} onChange={(value) => onUpdate({ rotationSensitivity: value })} />
            <SliderControl label="Gerakan vertikal" description="Respons kemiringan model saat tangan naik atau turun" value={settings.movementSensitivity} min={0.2} max={2.5} step={0.05} onChange={(value) => onUpdate({ movementSensitivity: value })} />
            <SliderControl label="Skala pinch" description="Respons ukuran model saat ibu jari dan telunjuk bergerak" value={settings.scaleSensitivity} min={0.2} max={2.5} step={0.05} onChange={(value) => onUpdate({ scaleSensitivity: value })} />
            <SliderControl label="Kehalusan gerakan" description="Nilai lebih tinggi menghasilkan gerakan lebih stabil" value={settings.smoothing} min={0.1} max={0.95} step={0.05} suffix="" onChange={(value) => onUpdate({ smoothing: value })} />
          </div>
          <div className="gesture-reference">
            <strong>Panduan gerakan</strong>
            <div><span className="gesture-symbol">↔</span><span>Geser tangan kiri atau kanan untuk rotasi.</span></div>
            <div><span className="gesture-symbol">↕</span><span>Gerakkan tangan ke atas atau bawah untuk memiringkan model.</span></div>
            <div><span className="gesture-symbol">⌖</span><span>Rapatkan atau renggangkan ibu jari dan telunjuk untuk mengatur skala.</span></div>
          </div>
          <div className="calibration-actions">
            <button className="button button-secondary" onClick={reset}><Icon name="reset" size={17} /> Reset</button>
            <button className="button button-primary" onClick={save}><Icon name="save" size={17} /> Simpan pengaturan</button>
          </div>
          {notice && <span className="save-notice"><Icon name="check" size={16} /> {notice}</span>}
          <span className="session-note">Pengaturan disimpan di sessionStorage, tidak disimpan permanen.</span>
        </section>
      </div>
    </div>
  );
}
