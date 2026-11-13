import { useEffect, useState } from 'react';
import type { InstrumentRecord, PageKey } from '../types/app';
import { Icon } from '../components/Icon';

interface HomePageProps {
  instruments: InstrumentRecord[];
  onNavigate: (page: PageKey) => void;
  onOpenInstrument: (instrument: InstrumentRecord) => void;
}

export function HomePage({ instruments, onNavigate, onOpenInstrument }: HomePageProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = instruments[activeIndex];

  useEffect(() => {
    if (instruments.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % instruments.length);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [instruments.length]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, instruments.length - 1)));
  }, [instruments.length]);

  return (
    <div className="page home-page">
      <section className="home-feature">
        <div className="home-copy">
          <span className="eyebrow">JELAJAHI BUNYI NUSANTARA</span>
          <h1>Kenali alat musik<br /><em>Indonesia</em> lebih dekat.</h1>
          <p>Temukan bentuk, suara, dan cerita di balik alat musik tradisional melalui pengalaman 3D dan Augmented Reality.</p>
          <button className="button button-primary" onClick={() => onNavigate('library')}>Jelajahi koleksi <Icon name="arrow" size={17} /></button>
          <div className="home-counter"><strong>{String(activeIndex + 1).padStart(2, '0')}</strong><span>/ {String(instruments.length).padStart(2, '0')}</span></div>
        </div>
        {active && (
          <button className="home-instrument" onClick={() => onOpenInstrument(active)} aria-label={`Buka detail ${active.name}`}>
            <div className="home-instrument-art"><img src={active.image} alt={active.name} /></div>
            <div className="home-instrument-caption">
              <div><span className="eyebrow">INSTRUMEN PILIHAN</span><h2>{active.name}</h2><p>{active.summary}</p></div>
              <span className="round-arrow"><Icon name="arrow" size={20} /></span>
            </div>
            <div className="carousel-dots" aria-label="Pilih instrumen carousel">
              {instruments.map((instrument, index) => (
                <span key={instrument.id} className={`carousel-dot ${index === activeIndex ? 'is-active' : ''}`} />
              ))}
            </div>
          </button>
        )}
      </section>

      <section className="quick-actions">
        <button className="quick-action quick-ar" onClick={() => onNavigate('ar')}>
          <span className="quick-icon"><Icon name="scan" size={24} /></span>
          <span><strong>AR Scan</strong><small>Arahkan kamera ke kartu alat musik</small></span>
          <Icon name="arrow" size={18} />
        </button>
        <button className="quick-action quick-gesture" onClick={() => onNavigate('calibration')}>
          <span className="quick-icon"><Icon name="hand" size={24} /></span>
          <span><strong>Kalibrasi Gestur</strong><small>Atur kendali model dengan tangan</small></span>
          <Icon name="arrow" size={18} />
        </button>
        <button className="quick-action quick-library" onClick={() => onNavigate('library')}>
          <span className="quick-icon"><Icon name="library" size={24} /></span>
          <span><strong>Perpustakaan</strong><small>Baca lima koleksi alat musik</small></span>
          <Icon name="arrow" size={18} />
        </button>
      </section>
    </div>
  );
}
