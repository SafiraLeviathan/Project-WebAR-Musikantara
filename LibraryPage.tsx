import type { InstrumentRecord } from '../types/app';
import { Icon } from '../components/Icon';

interface LibraryPageProps {
  instruments: InstrumentRecord[];
  onOpen: (instrument: InstrumentRecord) => void;
}

export function LibraryPage({ instruments, onOpen }: LibraryPageProps) {
  return (
    <div className="page library-page">
      <div className="page-intro">
        <div><span className="eyebrow">KOLEKSI MUSIK NUSANTARA</span><h1>Perpustakaan alat musik</h1><p>Pilih instrumen untuk melihat bentuk 2D, model 3D, dan informasi budayanya.</p></div>
        <span className="collection-count">{String(instruments.length).padStart(2, '0')} koleksi</span>
      </div>
      <div className="instrument-grid">
        {instruments.map((instrument, index) => (
          <button className={`instrument-card instrument-card-${instrument.id}`} key={instrument.id} onClick={() => onOpen(instrument)}>
            <div className="instrument-card-art"><img src={instrument.image} alt={instrument.name} loading="lazy" /></div>
            <div className="instrument-card-copy"><span className="instrument-number">0{index + 1} / {instrument.region}</span><h2>{instrument.name}</h2><p>{instrument.summary}</p><span className="card-link">Lihat detail <Icon name="arrow" size={16} /></span></div>
          </button>
        ))}
      </div>
    </div>
  );
}
