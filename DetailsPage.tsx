import { useState } from 'react';
import type { InstrumentRecord } from '../types/app';
import { Icon } from '../components/Icon';
import { ThreeViewport } from '../components/ThreeViewport';

interface DetailsPageProps {
  instrument: InstrumentRecord;
  onBack: () => void;
  onScan: (instrument: InstrumentRecord) => void;
}

export function DetailsPage({ instrument, onBack, onScan }: DetailsPageProps) {
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [playing, setPlaying] = useState(false);

  const playSound = async () => {
    const audio = new Audio(instrument.sound);
    setPlaying(true);
    audio.addEventListener('ended', () => setPlaying(false), { once: true });
    audio.addEventListener('error', () => setPlaying(false), { once: true });
    try { await audio.play(); } catch { setPlaying(false); }
  };

  return (
    <div className="page details-page">
      <div className="details-topbar">
        <button className="back-button" onClick={onBack}><Icon name="back" size={18} /> Kembali ke koleksi</button>
        <span className="eyebrow">DETAIL INSTRUMEN</span>
      </div>
      <div className="details-layout">
        <section className="details-visual-column">
          <div className="details-view-switch" role="group" aria-label="Mode pratinjau">
            <button className={view === '2d' ? 'is-selected' : ''} onClick={() => setView('2d')}>Ilustrasi 2D</button>
            <button className={view === '3d' ? 'is-selected' : ''} onClick={() => setView('3d')}>Model 3D</button>
          </div>
          <div className="details-art-stage">
            {view === '2d'
              ? <img className="details-image" src={instrument.image} alt={instrument.name} />
              : <ThreeViewport modelUrl={instrument.model} className="details-model" autoRotate />}
            <span className="stage-index">MUSIKANTARA / {instrument.id.toUpperCase()}</span>
          </div>
          <div className="details-actions">
            <button className="button button-primary" onClick={() => onScan(instrument)}><Icon name="scan" size={18} /> Coba AR Scan</button>
            <button className="button button-secondary" onClick={() => void playSound()}><Icon name="volume" size={18} /> {playing ? 'Memutar suara…' : 'Dengarkan suara'}</button>
          </div>
        </section>
        <section className="details-content">
          <span className="eyebrow">{instrument.region.toUpperCase()} · {instrument.family.toUpperCase()}</span>
          <h1>{instrument.name}</h1>
          <p className="details-lead">{instrument.summary}</p>
          <div className="detail-section"><h2>Tentang instrumen</h2><p>{instrument.description}</p></div>
          <div className="detail-section"><h2>Konteks budaya</h2><p>{instrument.culturalContext}</p></div>
          <div className="detail-section reference-section"><h2>Bacaan tepercaya</h2>
            {instrument.references.map((reference) => (
              <a className="reference-link" href={reference.url} target="_blank" rel="noreferrer" key={reference.url}>
                <span><strong>{reference.label}</strong><small>{reference.publisher}</small></span><Icon name="arrow" size={17} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
