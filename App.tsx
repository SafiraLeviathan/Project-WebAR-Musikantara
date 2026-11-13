import { useCallback, useEffect, useMemo, useState } from 'react';
import { HomePage } from './pages/HomePage';
import { ARScanPage } from './pages/ARScanPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { LibraryPage } from './pages/LibraryPage';
import { DetailsPage } from './pages/DetailsPage';
import { Icon } from './components/Icon';
import { getInstruments } from './services/api';
import { useCalibrationSettings } from './hooks/useCalibrationSettings';
import type { InstrumentRecord, PageKey } from './types/app';

const navigation: Array<{ id: Exclude<PageKey, 'details'>; label: string; icon: 'home' | 'scan' | 'hand' | 'library' }> = [
  { id: 'home', label: 'Beranda', icon: 'home' },
  { id: 'ar', label: 'AR Scan', icon: 'scan' },
  { id: 'calibration', label: 'Kalibrasi', icon: 'hand' },
  { id: 'library', label: 'Perpustakaan', icon: 'library' },
];

const pageTitles: Record<PageKey, string> = {
  home: 'Beranda',
  ar: 'AR Scan',
  calibration: 'Kalibrasi gestur',
  library: 'Perpustakaan',
  details: 'Detail instrumen',
};

export default function App() {
  const [page, setPage] = useState<PageKey>('home');
  const [instruments, setInstruments] = useState<InstrumentRecord[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentRecord | null>(null);
  const [preferredInstrumentId, setPreferredInstrumentId] = useState<string | null>(null);
  const [apiState, setApiState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [apiMessage, setApiMessage] = useState('');
  const calibration = useCalibrationSettings();

  useEffect(() => {
    let alive = true;
    getInstruments().then((records) => {
      if (!alive) return;
      setInstruments(records);
      setApiState('ready');
      setApiMessage('');
    }).catch((error: unknown) => {
      if (!alive) return;
      setApiState('error');
      setApiMessage(error instanceof Error ? error.message : 'API tidak dapat dihubungi.');
    });
    return () => { alive = false; };
  }, []);

  const navigate = useCallback((nextPage: PageKey) => {
    setPage(nextPage);
    if (nextPage !== 'ar') setPreferredInstrumentId(null);
  }, []);

  const openInstrument = useCallback((instrument: InstrumentRecord) => {
    setSelectedInstrument(instrument);
    setPage('details');
  }, []);

  const startScanFor = useCallback((instrument: InstrumentRecord) => {
    setSelectedInstrument(instrument);
    setPreferredInstrumentId(instrument.id);
    setPage('ar');
  }, []);

  const pageContent = useMemo(() => {
    if (page === 'home') return <HomePage instruments={instruments} onNavigate={navigate} onOpenInstrument={openInstrument} />;
    if (page === 'ar') return <ARScanPage instruments={instruments} settings={calibration.settings} preferredInstrumentId={preferredInstrumentId} onOpenInstrument={openInstrument} />;
    if (page === 'calibration') return <CalibrationPage settings={calibration.settings} onUpdate={calibration.update} onSave={calibration.save} onReset={calibration.reset} />;
    if (page === 'library') return <LibraryPage instruments={instruments} onOpen={openInstrument} />;
    if (selectedInstrument) return <DetailsPage instrument={selectedInstrument} onBack={() => navigate('library')} onScan={startScanFor} />;
    return <LibraryPage instruments={instruments} onOpen={openInstrument} />;
  }, [page, instruments, navigate, openInstrument, selectedInstrument, startScanFor, calibration.settings, calibration.update, calibration.save, calibration.reset, preferredInstrumentId]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-lockup" onClick={() => navigate('home')} aria-label="Musikantara, kembali ke beranda">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-text"><strong>musikantara</strong><small>RUANG MUSIK NUSANTARA</small></span>
        </button>
        <div className="sidebar-section-label">MENU UTAMA</div>
        <nav className="sidebar-nav" aria-label="Navigasi utama">
          {navigation.map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id || (page === 'details' && item.id === 'library') ? 'is-current' : ''}`} onClick={() => navigate(item.id)}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>{item.id === 'ar' && <span className="nav-live-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-spark">✳</span><p>Setiap bunyi menyimpan cerita. Mulai jelajahi warisan musik Indonesia.</p></div>
          <span className="sidebar-version">MUSIKANTARA WEBAR · 1.0.0</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark"><span /><span /><span /><span /></span>
            <strong>musikantara</strong>
          </div>
          <div className="breadcrumb"><span>Musikantara</span><Icon name="chevron" size={14} /><strong>{pageTitles[page]}</strong></div>
          <div className="topbar-right">
            <span className={`api-indicator ${apiState}`}><span /> {apiState === 'ready' ? 'API terhubung' : apiState === 'loading' ? 'Menghubungkan' : 'API bermasalah'}</span>
            <span className="topbar-divider" />
            <span className="topbar-edition">EDISI DIGITAL INDONESIA</span>
          </div>
        </header>
        <main className="content-area">
          {apiState === 'loading' && <div className="loading-strip"><span className="loading-spinner" /> Menghubungkan katalog instrumen…</div>}
          {apiState === 'error' && <div className="api-error"><Icon name="info" size={16} /> Backend belum terhubung: {apiMessage} Pastikan ZIP Member 2 sudah digabung ke proyek.</div>}
          {instruments.length > 0 ? pageContent : apiState === 'loading' ? <div className="page-loading"><span className="loading-spinner large" /><strong>Menyiapkan Musikantara</strong><p>Memuat data lima alat musik.</p></div> : <div className="page-error"><strong>Katalog belum tersedia</strong><p>Jalankan aplikasi setelah file backend Member 2 digabungkan.</p></div>}
        </main>
        <nav className="mobile-nav" aria-label="Navigasi mobile">
          {navigation.map((item) => <button key={item.id} className={page === item.id || (page === 'details' && item.id === 'library') ? 'is-current' : ''} onClick={() => navigate(item.id)}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}
        </nav>
      </div>
    </div>
  );
}
