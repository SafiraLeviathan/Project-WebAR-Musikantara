import { Camera, Check, Hand, Info, LoaderCircle, RefreshCw, Save, ScanLine } from 'lucide-react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState } from 'react'
import type { GestureSettings } from '../data/instruments'

type GestureCalibrationProps = {
  initialSettings: GestureSettings
  onSave: (settings: GestureSettings) => void
  onBack: () => void
}

const MEDIAPIPE_VERSION = '0.10.22'
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export function GestureCalibration({ initialSettings, onSave, onBack }: GestureCalibrationProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const [settings, setSettings] = useState<GestureSettings>({ ...initialSettings })
  const [cameraReady, setCameraReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [handFound, setHandFound] = useState(false)
  const [pinchValue, setPinchValue] = useState<number | null>(null)
  const [cameraError, setCameraError] = useState('')
  const [saved, setSaved] = useState(false)
  const [cubeTransform, setCubeTransform] = useState('rotateX(-22deg) rotateY(-32deg)')

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      landmarkerRef.current?.close()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser ini belum mendukung akses kamera. Gunakan browser versi terbaru.')
      return
    }
    setLoading(true)
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('Tampilan kamera belum siap.')
      video.srcObject = stream
      await video.play()

      const vision = await FilesetResolver.forVisionTasks(
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`,
      )
      let landmarker: HandLandmarker
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        })
      } catch {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        })
      }
      landmarkerRef.current = landmarker
      setCameraReady(true)
      setLoading(false)

      const detect = () => {
        const currentVideo = videoRef.current
        const currentLandmarker = landmarkerRef.current
        if (currentVideo && currentLandmarker && currentVideo.readyState >= 2) {
          const result = currentLandmarker.detectForVideo(currentVideo, performance.now())
          const landmarks = result.landmarks[0]
          if (landmarks) {
            const thumb = landmarks[4]
            const index = landmarks[8]
            const distance = Math.hypot(thumb.x - index.x, thumb.y - index.y)
            setHandFound(true)
            setPinchValue(distance)
            const dx = index.x - landmarks[0].x
            const dy = index.y - landmarks[0].y
            const angle = Math.atan2(dy, dx)
            setCubeTransform(`translate3d(${(index.x - 0.5) * 46}px, ${(index.y - 0.5) * 32}px, 0) rotateX(${(-angle * 18 - 20).toFixed(1)}deg) rotateY(${(angle * 30 - 32).toFixed(1)}deg) scale(${(1 + (0.11 - distance) * 1.2).toFixed(2)})`)
          } else {
            setHandFound(false)
            setPinchValue(null)
          }
        }
        frameRef.current = requestAnimationFrame(detect)
      }
      frameRef.current = requestAnimationFrame(detect)
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setLoading(false)
      setCameraReady(false)
      setCameraError(error instanceof Error ? error.message : 'Kamera tidak dapat diaktifkan. Periksa izin kamera.')
    }
  }

  function stopCamera() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraReady(false)
    setHandFound(false)
    setPinchValue(null)
  }

  function updateSetting<K extends keyof GestureSettings>(key: K, value: GestureSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  function saveCalibration() {
    onSave({ ...settings })
    setSaved(true)
  }

  return (
    <main className="page-shell calibration-page">
      <div className="page-heading">
        <span className="eyebrow"><Hand size={15} /> PENGATURAN TANGAN</span>
        <h1>Kalibrasi gestur</h1>
        <p>Atur gerakan tangan agar model 3D mudah dikendalikan.</p>
      </div>

      <div className="calibration-layout">
        <section className="calibration-preview-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">AREA UJI</span><h2>Coba gerakkan tanganmu</h2></div>
            <span className={`live-status ${cameraReady ? 'is-live' : ''}`}><i /> {cameraReady ? 'Kamera aktif' : 'Belum aktif'}</span>
          </div>
          <div className="calibration-stage">
            <div className="calibration-camera">
              <video ref={videoRef} playsInline muted aria-label="Pratinjau kamera untuk kalibrasi tangan" />
              {!cameraReady && <div className="camera-placeholder"><Camera size={32} /><span>Kamera belum dinyalakan</span></div>}
              {cameraReady && <span className={`hand-detection-pill ${handFound ? 'detected' : ''}`}>{handFound ? 'Tangan terdeteksi' : 'Tunjukkan tangan ke kamera'}</span>}
            </div>
            <div className="cube-area" aria-label="Kubus tiga dimensi untuk menguji gerakan">
              <div className="cube-shadow" />
              <div className="calibration-cube" style={{ transform: cubeTransform }}>
                <div className="cube-face cube-front">N</div>
                <div className="cube-face cube-back">N</div>
                <div className="cube-face cube-right">A</div>
                <div className="cube-face cube-left">D</div>
                <div className="cube-face cube-top">A</div>
                <div className="cube-face cube-bottom">♪</div>
              </div>
              <span className="cube-caption">OBJEK 3D UJI</span>
            </div>
          </div>
          <div className="preview-footer">
            <div className="detection-note"><span className={`detection-dot ${handFound ? 'active' : ''}`} />{handFound ? `Jarak jari: ${pinchValue?.toFixed(3)}` : 'Satukan ibu jari dan telunjuk untuk mencoba.'}</div>
            {!cameraReady ? (
              <button className="button button-primary button-small" onClick={startCamera} disabled={loading}>
                {loading ? <LoaderCircle className="spin" size={17} /> : <Camera size={17} />} {loading ? 'Menyiapkan kamera' : 'Aktifkan kamera'}
              </button>
            ) : (
              <button className="button button-soft button-small" onClick={stopCamera}><RefreshCw size={16} /> Matikan kamera</button>
            )}
          </div>
          {cameraError && <p className="inline-error" role="alert">{cameraError}</p>}
        </section>

        <section className="calibration-settings-panel">
          <div className="panel-heading"><div><span className="eyebrow">PREFERENSI</span><h2>Atur kenyamanan</h2></div><ScanLine size={22} /></div>
          <div className="setting-item">
            <div className="setting-label"><strong>Jarak cubitan</strong><span>Seberapa dekat dua jari dianggap mencubit.</span></div>
            <div className="setting-value">{settings.pinchThreshold.toFixed(2)}</div>
            <input aria-label="Jarak cubitan" type="range" min="0.05" max="0.16" step="0.005" value={settings.pinchThreshold} onChange={(event) => updateSetting('pinchThreshold', Number(event.target.value))} />
            <div className="range-labels"><span>Lebih dekat</span><span>Lebih longgar</span></div>
          </div>
          <div className="setting-item">
            <div className="setting-label"><strong>Kepekaan gerak</strong><span>Atur seberapa jauh model mengikuti tangan.</span></div>
            <div className="setting-value">{settings.movementSensitivity.toFixed(1)}×</div>
            <input aria-label="Kepekaan gerak" type="range" min="0.5" max="2" step="0.1" value={settings.movementSensitivity} onChange={(event) => updateSetting('movementSensitivity', Number(event.target.value))} />
            <div className="range-labels"><span>Pelan</span><span>Cepat</span></div>
          </div>
          <div className="setting-item">
            <div className="setting-label"><strong>Kepekaan ukuran</strong><span>Atur respons saat jari direnggangkan.</span></div>
            <div className="setting-value">{settings.zoomSensitivity.toFixed(1)}×</div>
            <input aria-label="Kepekaan ukuran" type="range" min="0.5" max="2" step="0.1" value={settings.zoomSensitivity} onChange={(event) => updateSetting('zoomSensitivity', Number(event.target.value))} />
            <div className="range-labels"><span>Pelan</span><span>Cepat</span></div>
          </div>
          <div className="calibration-help"><Info size={17} /><span>Gerakkan tangan perlahan di depan kamera. Pengaturan ini berlaku untuk tab yang sedang dibuka.</span></div>
          <div className="calibration-actions">
            <button className="button button-soft" onClick={() => setSettings({ ...initialSettings })}>Atur ulang</button>
            <button className="button button-primary" onClick={saveCalibration}><Save size={17} /> Simpan pengaturan</button>
          </div>
          {saved && <p className="saved-note"><Check size={16} /> Pengaturan tersimpan untuk sesi ini.</p>}
        </section>
      </div>
      <div className="calibration-bottom-note"><span>Privasi terjaga</span><span>Kamera diproses langsung di perangkat, tidak dikirim ke server.</span></div>
      <button className="back-text-button" onClick={onBack}>Kembali ke beranda</button>
    </main>
  )
}
