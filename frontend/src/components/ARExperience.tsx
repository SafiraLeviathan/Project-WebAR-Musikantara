import { AlertCircle, Camera, CheckCircle2, Hand, Minus, Move, Plus, RotateCcw, RotateCw, ScanLine, X } from 'lucide-react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { instruments, type GestureSettings } from '../data/instruments'

const TARGET_FILE = '/targets/nada-nusantara.mind'
const MEDIAPIPE_VERSION = '0.10.22'
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

type ARExperienceProps = {
  gestureSettings: GestureSettings
  hasCalibration: boolean
  onExit: () => void
}

type GestureFrame = {
  x: number
  y: number
  distance: number
  angle: number
}

export function ARExperience({ gestureSettings, hasCalibration, onExit }: ARExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mindarRef = useRef<MindARThree | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const modelRootsRef = useRef<Map<string, THREE.Group>>(new Map())
  const previousGestureRef = useRef<GestureFrame | null>(null)
  const baseScaleRef = useRef(1)
  const baseDistanceRef = useRef(0.08)
  const gestureSettingsRef = useRef(gestureSettings)
  const activeIdRef = useRef<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeInstrumentId, setActiveInstrumentId] = useState<string | null>(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [gestureEnabled, setGestureEnabled] = useState(true)
  const [handDetected, setHandDetected] = useState(false)
  const [notice, setNotice] = useState('Arahkan kamera ke salah satu kartu AR.')
  const [gestureUnavailable, setGestureUnavailable] = useState(false)

  useEffect(() => {
    gestureSettingsRef.current = gestureSettings
  }, [gestureSettings])

  useEffect(() => {
    activeIdRef.current = activeInstrumentId
    previousGestureRef.current = null
  }, [activeInstrumentId])

  useEffect(() => {
    if (status !== 'running' || !gestureEnabled || !containerRef.current) return
    let cancelled = false

    async function beginHandTracking() {
      try {
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
        if (cancelled) {
          landmarker.close()
          return
        }
        handLandmarkerRef.current = landmarker

        const detect = () => {
          const host = containerRef.current
          const video = host?.querySelector('video')
          const currentLandmarker = handLandmarkerRef.current
          if (video instanceof HTMLVideoElement && currentLandmarker && video.readyState >= 2) {
            const result = currentLandmarker.detectForVideo(video, performance.now())
            const landmarks = result.landmarks[0]
            if (landmarks) {
              const thumb = landmarks[4]
              const index = landmarks[8]
              const wrist = landmarks[0]
              const distance = Math.hypot(thumb.x - index.x, thumb.y - index.y)
              const midpointX = (thumb.x + index.x) / 2
              const midpointY = (thumb.y + index.y) / 2
              const angle = Math.atan2(index.y - wrist.y, index.x - wrist.x)
              const nextFrame = { x: midpointX, y: midpointY, distance, angle }
              const previous = previousGestureRef.current
              const settings = gestureSettingsRef.current
              const activeId = activeIdRef.current
              const root = activeId ? modelRootsRef.current.get(activeId) : undefined

              if (distance <= settings.pinchThreshold && root) {
                if (previous && previous.distance <= settings.pinchThreshold) {
                  const deltaX = nextFrame.x - previous.x
                  const deltaY = nextFrame.y - previous.y
                  const angleDelta = Math.atan2(
                    Math.sin(nextFrame.angle - previous.angle),
                    Math.cos(nextFrame.angle - previous.angle),
                  )
                  const movement = settings.movementSensitivity
                  root.position.x = THREE.MathUtils.clamp(root.position.x - deltaX * 2.6 * movement, -0.7, 0.7)
                  root.position.y = THREE.MathUtils.clamp(root.position.y - deltaY * 2.6 * movement, -0.7, 0.7)
                  root.rotation.y += angleDelta * 1.1 * movement
                  const scaleFactor = THREE.MathUtils.clamp(
                    1 + ((distance - baseDistanceRef.current) * 7 * settings.zoomSensitivity),
                    0.65,
                    1.45,
                  )
                  const newScale = THREE.MathUtils.clamp(baseScaleRef.current * scaleFactor, 0.55, 1.65)
                  root.scale.setScalar(newScale)
                } else {
                  baseScaleRef.current = root.scale.x
                  baseDistanceRef.current = Math.max(distance, 0.025)
                  setNotice('Gestur aktif: gerakkan tangan untuk menggeser dan memutar model.')
                }
                previousGestureRef.current = nextFrame
              } else {
                previousGestureRef.current = null
              }
              setHandDetected(true)
            } else {
              previousGestureRef.current = null
              setHandDetected(false)
            }
          }
          if (!cancelled) animationFrameRef.current = requestAnimationFrame(detect)
        }
        animationFrameRef.current = requestAnimationFrame(detect)
      } catch {
        setGestureUnavailable(true)
        setHandDetected(false)
      }
    }

    void beginHandTracking()
    return () => {
      cancelled = true
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
      handLandmarkerRef.current?.close()
      handLandmarkerRef.current = null
      previousGestureRef.current = null
    }
  }, [status, gestureEnabled])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
      handLandmarkerRef.current?.close()
      const mindar = mindarRef.current
      if (mindar) {
        mindar.renderer.setAnimationLoop(null)
        mindar.stop()
        mindar.renderer.dispose()
      }
      mindarRef.current = null
      modelRootsRef.current.clear()
    }
  }, [])

  async function startAR() {
    const container = containerRef.current
    if (!container || status === 'starting' || status === 'running') return
    setStatus('starting')
    setErrorMessage('')
    setGestureUnavailable(false)
    setNotice('Menyiapkan kamera dan kartu AR...')

    try {
      const targetResponse = await fetch(TARGET_FILE, { method: 'HEAD', cache: 'no-store' })
      if (!targetResponse.ok) {
        throw new Error('Berkas kartu AR belum tersedia. Buat file nada-nusantara.mind dari lima kartu AR, lalu letakkan di folder assets/targets.')
      }

      const mindar = new MindARThree({
        container,
        imageTargetSrc: TARGET_FILE,
        maxTrack: 1,
        filterMinCF: 0.0001,
        filterBeta: 0.001
      })
      mindarRef.current = mindar
      mindar.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6b4c, 2.2))
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.1)
      keyLight.position.set(0, 2, 3)
      mindar.scene.add(keyLight)

      const loader = new GLTFLoader()
      for (const instrument of instruments) {
        const anchor = mindar.addAnchor(instrument.targetIndex)
        const modelRoot = new THREE.Group()
        anchor.group.add(modelRoot)
        modelRootsRef.current.set(instrument.id, modelRoot)
        let loadStarted = false

        anchor.onTargetFound = () => {
          activeIdRef.current = instrument.id
          setActiveInstrumentId(instrument.id)
          setNotice(`Kartu ${instrument.name} terbaca. Model sedang disiapkan.`)
          if (loadStarted || modelRoot.children.length > 0) return
          loadStarted = true
          setModelLoading(true)
          void loader.loadAsync(instrument.modelPath).then((gltf) => {
            const object = gltf.scene
            object.updateMatrixWorld(true)
            const bounds = new THREE.Box3().setFromObject(object)
            const center = bounds.getCenter(new THREE.Vector3())
            const dimensions = bounds.getSize(new THREE.Vector3())
            const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z)
            object.position.sub(center)
            const normalized = new THREE.Group()
            normalized.scale.setScalar(maxDimension > 0 ? 0.76 / maxDimension : 0.76)
            normalized.add(object)
            modelRoot.add(normalized)
            setModelLoading(false)
            setNotice(`Model ${instrument.name} siap. Coba gerakkan tangan atau gunakan kontrol di bawah.`)
          }).catch(() => {
            loadStarted = false
            setModelLoading(false)
            setNotice(`Model ${instrument.name} tidak dapat dimuat. Periksa file model di folder assets/asset-3d.`)
          })
        }

        anchor.onTargetLost = () => {
          // Target yang hilang tidak menghapus model; model muncul kembali saat kartu terbaca lagi.
        }
      }

      await mindar.start()
      mindar.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      mindar.renderer.setAnimationLoop(() => mindar.renderer.render(mindar.scene, mindar.camera))
      setStatus('running')
      setNotice('Arahkan kamera ke salah satu kartu AR.')
    } catch (error) {
      const mindar = mindarRef.current
      if (mindar) {
        mindar.renderer.setAnimationLoop(null)
        mindar.stop()
        mindar.renderer.dispose()
        mindarRef.current = null
      }
      container.replaceChildren()
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Kamera belum dapat dinyalakan. Periksa izin kamera dan coba lagi.')
    }
  }

  function adjustScale(amount: number) {
    const id = activeIdRef.current
    const root = id ? modelRootsRef.current.get(id) : undefined
    if (!root) return
    const next = THREE.MathUtils.clamp(root.scale.x + amount, 0.55, 1.65)
    root.scale.setScalar(next)
  }

  function rotateModel(direction: number) {
    const id = activeIdRef.current
    const root = id ? modelRootsRef.current.get(id) : undefined
    if (!root) return
    root.rotation.y += direction * 0.24
  }

  function resetModel() {
    const id = activeIdRef.current
    const root = id ? modelRootsRef.current.get(id) : undefined
    if (!root) return
    root.position.set(0, 0, 0)
    root.rotation.set(0, 0, 0)
    root.scale.setScalar(1)
    previousGestureRef.current = null
  }

  function closeAR() {
    const mindar = mindarRef.current
    if (mindar) {
      mindar.renderer.setAnimationLoop(null)
      mindar.stop()
      mindar.renderer.dispose()
      mindarRef.current = null
    }
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    handLandmarkerRef.current?.close()
    handLandmarkerRef.current = null
    modelRootsRef.current.clear()
    onExit()
  }

  const activeInstrument = instruments.find((instrument) => instrument.id === activeInstrumentId)

  return (
    <main className="ar-page">
      <div className="ar-topbar">
        <div><span className="eyebrow">PENGALAMAN AUGMENTED REALITY</span><h1>Ruang AR</h1></div>
        <button className="icon-button ar-close-button" onClick={closeAR} aria-label="Tutup kamera"><X size={21} /></button>
      </div>

      <div className="ar-workspace">
        <section className="ar-camera-panel">
          <div className="ar-camera-frame" ref={containerRef}>
            {status !== 'running' && (
              <div className="ar-camera-placeholder">
                <div className="scan-illustration"><ScanLine size={46} strokeWidth={1.4} /></div>
                {status === 'starting' ? <><strong>Menyiapkan kamera</strong><span>Pastikan izin kamera sudah diberikan.</span></> : <><strong>Siap memindai kartu</strong><span>Letakkan kartu AR di depan kamera.</span></>}
              </div>
            )}
            {status === 'running' && <div className="scan-corners" aria-hidden="true"><i /><i /><i /><i /></div>}
            {status === 'running' && <div className="ar-live-label"><span className="live-dot" /> KAMERA AKTIF</div>}
            {status === 'running' && activeInstrument && <div className="ar-found-label"><CheckCircle2 size={16} /> {activeInstrument.name}</div>}
          </div>
          <div className="ar-camera-status">
            <div className="ar-status-copy"><strong>{activeInstrument ? activeInstrument.name : status === 'running' ? 'Mencari kartu AR' : 'Kamera belum aktif'}</strong><span>{notice}</span></div>
            {status === 'idle' || status === 'error' ? (
              <button className="button button-primary" onClick={startAR}><Camera size={18} /> Nyalakan kamera</button>
            ) : status === 'starting' ? (
              <button className="button button-soft" disabled><span className="button-spinner" /> Memuat</button>
            ) : (
              <span className="ar-live-text"><span className="live-dot" /> Memindai</span>
            )}
          </div>
          {status === 'error' && <div className="ar-error-message" role="alert"><AlertCircle size={18} /><span>{errorMessage}</span></div>}
        </section>

        <aside className="ar-side-panel">
          <section className="ar-side-card ar-instruction-card">
            <span className="eyebrow">PANDUAN SINGKAT</span>
            <h2>Arahkan kartu ke kamera</h2>
            <p>Pastikan kartu terlihat jelas dan mendapat cahaya yang cukup.</p>
            <div className="ar-mini-steps"><span>01</span><span>Letakkan kartu di depan kamera</span></div>
            <div className="ar-mini-steps"><span>02</span><span>Tahan sampai model 3D muncul</span></div>
          </section>
          <section className="ar-side-card ar-gesture-card">
            <div className="gesture-card-heading"><div><span className="eyebrow">KONTROL TANGAN</span><h2>Gestur tangan</h2></div><Hand size={22} /></div>
            <label className="gesture-toggle"><span><strong>Gunakan gestur</strong><small>{hasCalibration ? 'Pengaturan kalibrasi aktif' : 'Pengaturan awal digunakan'}</small></span><input type="checkbox" checked={gestureEnabled} onChange={(event) => setGestureEnabled(event.target.checked)} /><i /></label>
            {gestureUnavailable && gestureEnabled && <p className="gesture-warning">Deteksi tangan belum siap. Periksa koneksi internet lalu muat ulang halaman.</p>}
            {gestureEnabled && <p className="gesture-hint">{handDetected ? 'Tangan terdeteksi. Satukan ibu jari dan telunjuk untuk mengendalikan model.' : 'Tunjukkan tangan ke kamera setelah kartu terbaca.'}</p>}
            <div className="gesture-key-list"><span><i className="gesture-key pinch-key" /> Cubit dan gerakkan untuk menggeser</span><span><i className="gesture-key" /> Ubah jarak jari untuk mengatur ukuran</span></div>
          </section>
          <section className="ar-side-card ar-model-card">
            <span className="eyebrow">OBJEK TERDETEKSI</span>
            {activeInstrument ? <div className="found-instrument"><img src={activeInstrument.imagePath} alt="" /><div><strong>{activeInstrument.name}</strong><span>{activeInstrument.region}</span></div>{modelLoading && <span className="small-spinner" />}</div> : <p className="empty-detection">Belum ada kartu yang terbaca.</p>}
            <div className="model-controls" aria-label="Kontrol model 3D">
              <button onClick={() => adjustScale(-0.08)} disabled={!activeInstrument} aria-label="Kecilkan model"><Minus size={17} /></button>
              <button onClick={resetModel} disabled={!activeInstrument} aria-label="Atur ulang model"><RotateCcw size={17} /></button>
              <button onClick={() => adjustScale(0.08)} disabled={!activeInstrument} aria-label="Besarkan model"><Plus size={17} /></button>
              <button onClick={() => rotateModel(-1)} disabled={!activeInstrument} aria-label="Putar ke kiri"><RotateCcw size={17} /></button>
              <button onClick={() => rotateModel(1)} disabled={!activeInstrument} aria-label="Putar ke kanan"><RotateCw size={17} /></button>
              <span className="move-label"><Move size={14} /> Kontrol manual</span>
            </div>
          </section>
        </aside>
      </div>
      <div className="ar-bottom-note"><span>Gunakan kamera belakang di ponsel.</span><span>Gestur diproses langsung di perangkat.</span></div>
    </main>
  )
}
