import { ArrowUpRight, Play } from 'lucide-react'
import type { Instrument } from '../data/instruments'

type InstrumentCardProps = {
  instrument: Instrument
  onOpen: (instrument: Instrument) => void
  onPlay: (instrument: Instrument) => void
}

export function InstrumentCard({ instrument, onOpen, onPlay }: InstrumentCardProps) {
  return (
    <article className={`instrument-card instrument-${instrument.id}`}>
      <button className="instrument-card-main" onClick={() => onOpen(instrument)} aria-label={`Pelajari ${instrument.name}`}>
        <span className="instrument-card-art">
          <img src={instrument.imagePath} alt={instrument.name} loading="lazy" />
        </span>
        <span className="instrument-card-copy">
          <span className="eyebrow">{instrument.region}</span>
          <strong>{instrument.name}</strong>
          <span>{instrument.intro}</span>
        </span>
        <span className="card-open-icon"><ArrowUpRight size={19} /></span>
      </button>
      <div className="instrument-card-footer">
        <span>{instrument.family}</span>
        <button className="sound-chip" onClick={() => onPlay(instrument)} aria-label={`Dengarkan suara ${instrument.name}`}>
          <Play size={13} fill="currentColor" /> Suara
        </button>
      </div>
    </article>
  )
}
