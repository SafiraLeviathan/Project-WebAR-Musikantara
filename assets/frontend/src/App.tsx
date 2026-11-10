import { ArrowDown, ArrowRight, ArrowUpRight, Camera, Hand, Headphones, MapPinned, Music2, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { AudioPlayer } from './components/AudioPlayer'
import { ARExperience } from './components/ARExperience'
import { GestureCalibration } from './components/GestureCalibration'
import { InstrumentCard } from './components/InstrumentCard'
import { defaultGestureSettings, instruments, type GestureSettings, type Instrument } from './data/instruments'

type View = 'home' | 'detail' | 'ar' | 'calibration'

function App() {
  const [view, setView] = useState<View>('home')
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(instruments[0])
  const [gestureSettings, setGestureSettings] = useState<GestureSettings>({ ...defaultGestureSettings })
  const [hasCalibration, setHasCalibration] = useState(false)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  function openDetail(instrument: Instrument) {
    previewAudioRef.current?.pause()
    setSelectedInstrument(instrument)
    setView('detail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function previewSound(instrument: Instrument) {
    const current = previewAudioRef.current
    if (current && current.src.endsWith(instrument.audioPath) && !current.paused) {
      current.pause()
      return
    }
    current?.pause()
    const audio = new Audio(instrument.audioPath)
    previewAudioRef.current = audio
    void audio.play().catch(() => {
      openDetail(instrument)
    })
  }

  function goHome() {
    previewAudioRef.current?.pause()
    setView('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startAR(instrument?: Instrument) {
    if (instrument) setSelectedInstrument(instrument)
    previewAudioRef.current?.pause()
    setView('ar')
  }

  function saveGestureSettings(settings: GestureSettings) {
    setGestureSettings(settings)
    setHasCalibration(true)
  }

  if (view === 'ar') {
    return <ARExperience gestureSettings={gestureSettings} hasCalibration={hasCalibration} onExit={goHome} />
  }

  return (
    <div className="app-root">
      <AppHeader
        view={view}
        onHome={goHome}
        onBack={view === 'calibration' ? goHome : goHome}
        onCalibrate={() => setView('calibration')}
      />

      {view === 'calibration' ? (
        <GestureCalibration
          initialSettings={gestureSettings}
          onSave={saveGestureSettings}
          onBack={goHome}
        />
      ) : view === 'detail' ? (
        <InstrumentDetail
          instrument={selectedInstrument}
          onStartAR={() => startAR(selectedInstrument)}
          onBack={goHome}
        />
      ) : (
        <HomePage
          onOpen={openDetail}
          onPlay={previewSound}
          onStartAR={() => startAR()}
          onCalibrate={() => setView('calibration')}
          hasCalibration={hasCalibration}
        />
      )}

      <footer className="site-footer">
        <div className="footer-brand"><span className="brand-mark"><Music2 size={18} /></span><strong>NADA NUSANTARA</strong></div>
        <span>Belajar bunyi, mengenal budaya Indonesia.</span>
        <span className="footer-copyright">© 2026 Nada Nusantara</span>
      </footer>
    </div>
  )
}

function HomePage({
  onOpen,
  onPlay,
  onStartAR,
  onCalibrate,
  hasCalibration,
}: {
  onOpen: (instrument: Instrument) => void
  onPlay: (instrument: Instrument) => void
  onStartAR: () => void
  onCalibrate: () => void
  hasCalibration: boolean
}) {
  return (
    <main className="page-shell home-page">
      <section className="hero-grid">
        <div className="hero-copy-card">
          <span className="eyebrow"><Sparkles size={15} /> RUANG BELAJAR MUSIK TRADISIONAL</span>
          <h1>Kenali bunyi,<br /><em>jelajahi</em> Nusantara.</h1>
          <p>Temukan cerita alat musik Indonesia dan lihat bentuknya dalam pengalaman 3D.</p>
          <div className="hero-actions">
            <button className="button button-primary button-large" onClick={onStartAR}><Camera size={19} /> Mulai scan AR <ArrowRight size={17} /></button>
            <button className="button button-soft button-large" onClick={onCalibrate}><Hand size={18} /> Kalibrasi gestur</button>
          </div>
          <div className="hero-meta"><span><i /> Tanpa akun</span><span><i /> Langsung dari browser</span></div>
        </div>
        <div className="hero-visual-card">
          <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
          <div className="hero-visual-tag"><span className="visual-tag-dot" /> BUNYI DARI INDONESIA</div>
          <img className="hero-angklung" src="/asset-2d/Angklung_NoBG.png" alt="Ilustrasi alat musik angklung" />
          <div className="hero-floating-note note-one">♪</div><div className="hero-floating-note note-two">♫</div>
          <div className="hero-visual-bottom"><span>01 / 05</span><strong>Kenali alat musiknya</strong><ArrowUpRight size={18} /></div>
        </div>
      </section>

      <section className="learning-strip">
        <div className="learning-strip-title"><span className="eyebrow">MULAI DARI SINI</span><strong>Belajar dengan tiga langkah.</strong></div>
        <div className="learning-step"><span>01</span><div><strong>Pilih musik</strong><small>Kenali alatnya</small></div></div>
        <div className="learning-step"><span>02</span><div><strong>Dengarkan</strong><small>Kenali bunyinya</small></div></div>
        <div className="learning-step"><span>03</span><div><strong>Lihat dalam AR</strong><small>Jelajahi bentuk 3D</small></div></div>
      </section>

      <section className="catalog-section" id="koleksi">
        <div className="section-heading">
          <div><span className="eyebrow">KOLEKSI PILIHAN</span><h2>Alat musik Nusantara</h2><p>Pilih satu alat musik untuk mulai mengenal bunyinya.</p></div>
          <span className="collection-count">05 <small>ALAT MUSIK</small></span>
        </div>
        <div className="instrument-grid">
          {instruments.map((instrument) => (
            <InstrumentCard key={instrument.id} instrument={instrument} onOpen={onOpen} onPlay={onPlay} />
          ))}
        </div>
      </section>

      <section className="ar-promo-card">
        <div className="ar-promo-icon"><Camera size={29} /></div>
        <div className="ar-promo-copy"><span className="eyebrow">PENGALAMAN 3D</span><h2>Bawa alat musik ke ruangmu.</h2><p>Gunakan kartu AR untuk melihat model alat musik dari berbagai arah.</p></div>
        <button className="button button-dark" onClick={onStartAR}>Mulai pengalaman <ArrowUpRight size={18} /></button>
        <div className="promo-decoration">♪</div>
      </section>

      <section className="gesture-promo-card">
        <div className="gesture-promo-illustration"><div className="gesture-ring ring-a" /><div className="gesture-ring ring-b" /><Hand size={62} strokeWidth={1.2} /></div>
        <div className="gesture-promo-copy"><span className="eyebrow">KONTROL LEBIH SERU</span><h2>Gerakkan dengan tanganmu.</h2><p>Atur gerak model 3D dengan gestur tangan. Lakukan kalibrasi terlebih dahulu agar terasa nyaman.</p></div>
        <button className="button button-soft" onClick={onCalibrate}>{hasCalibration ? 'Ubah kalibrasi' : 'Atur gestur'} <ArrowRight size={17} /></button>
      </section>

      <div className="home-bottom-note"><span><Headphones size={16} /> Pakai suara untuk mengenali karakter setiap alat musik.</span><span><ArrowDown size={16} /> Jelajahi koleksi di atas</span></div>
    </main>
  )
}

function InstrumentDetail({
  instrument,
  onStartAR,
  onBack,
}: {
  instrument: Instrument
  onStartAR: () => void
  onBack: () => void
}) {
  return (
    <main className="page-shell detail-page">
      <button className="breadcrumb-button" onClick={onBack}>Koleksi alat musik <span>/</span> {instrument.name}</button>
      <section className={`detail-hero detail-${instrument.id}`}>
        <div className="detail-visual">
          <span className="detail-number">NADA / 0{instrument.targetIndex + 1}</span>
          <img src={instrument.imagePath} alt={`Ilustrasi ${instrument.name}`} />
          <span className="detail-visual-caption">ALAT MUSIK TRADISIONAL</span>
        </div>
        <div className="detail-copy">
          <span className="eyebrow"><MapPinned size={15} /> {instrument.region.toUpperCase()}</span>
          <h1>{instrument.name}</h1>
          <span className="detail-family">{instrument.family}</span>
          <p>{instrument.description}</p>
          <AudioPlayer instrument={instrument} />
          <button className="button button-primary button-large detail-ar-button" onClick={onStartAR}><Camera size={18} /> Lihat dalam AR <ArrowUpRight size={18} /></button>
        </div>
      </section>

      <section className="detail-lower-grid">
        <div className="detail-facts-card">
          <span className="eyebrow">KENALI LEBIH DEKAT</span><h2>Fakta singkat</h2>
          <ul>{instrument.facts.map((fact) => <li key={fact}><span><ArrowRight size={15} /></span>{fact}</li>)}</ul>
        </div>
        <div className="detail-card-instruction">
          <div><span className="eyebrow">KARTU AR</span><h2>Siapkan kartu {instrument.name}</h2><p>Arahkan kartu ke kamera untuk melihat model 3D.</p></div>
          <img src={instrument.cardPath} alt={`Kartu AR ${instrument.name}`} />
          <button className="button button-dark" onClick={onStartAR}>Buka kamera <Camera size={17} /></button>
        </div>
      </section>
      <div className="detail-footer-line"><span>Setiap alat musik punya cerita dan bunyi yang berbeda.</span><span>0{instrument.targetIndex + 1} / 05</span></div>
    </main>
  )
}

export default App
