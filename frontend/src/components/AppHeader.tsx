import { ArrowLeft, AudioLines, Hand, House } from 'lucide-react'

type AppHeaderProps = {
  view: 'home' | 'detail' | 'ar' | 'calibration'
  onHome: () => void
  onBack?: () => void
  onCalibrate: () => void
}

export function AppHeader({ view, onHome, onBack, onCalibrate }: AppHeaderProps) {
  const isSubpage = view !== 'home'

  return (
    <header className="site-header">
      <button className="brand-button" onClick={onHome} aria-label="Kembali ke beranda">
        <span className="brand-mark"><AudioLines size={22} strokeWidth={2.4} /></span>
        <span className="brand-wordmark">NADA <b>NUSANTARA</b></span>
      </button>

      <nav className="header-actions" aria-label="Navigasi utama">
        {isSubpage ? (
          <button className="header-link" onClick={onBack ?? onHome}>
            <ArrowLeft size={17} /> <span>Kembali</span>
          </button>
        ) : (
          <button className="header-link" onClick={onHome}>
            <House size={17} /> <span>Beranda</span>
          </button>
        )}
        <button className="header-calibrate" onClick={onCalibrate}>
          <Hand size={17} /> <span>Kalibrasi gestur</span>
        </button>
      </nav>
    </header>
  )
}
