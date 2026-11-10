import { Pause, Play, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Instrument } from '../data/instruments'

type AudioPlayerProps = {
  instrument: Instrument
}

export function AudioPlayer({ instrument }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setPlaying(false)
    setError(false)
    audio.pause()
    audio.currentTime = 0
  }, [instrument.id])

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return
    setError(false)
    if (audio.paused) {
      try {
        await audio.play()
        setPlaying(true)
      } catch {
        setError(true)
        setPlaying(false)
      }
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={instrument.audioPath}
        preload="none"
        onEnded={() => setPlaying(false)}
        onError={() => { setError(true); setPlaying(false) }}
      />
      <button className="audio-play-button" onClick={togglePlayback} aria-label={playing ? 'Jeda suara' : 'Putar suara'}>
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <div className="audio-player-copy">
        <strong>{playing ? 'Sedang diputar' : 'Dengarkan bunyinya'}</strong>
        <span>{error ? 'Audio belum dapat diputar.' : instrument.name}</span>
      </div>
      <Volume2 className="audio-volume-icon" size={20} />
    </div>
  )
}
