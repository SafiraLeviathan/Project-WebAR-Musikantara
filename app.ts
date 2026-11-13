export interface InstrumentReference {
  label: string;
  publisher: string;
  url: string;
}

export interface InstrumentRecord {
  id: string;
  name: string;
  region: string;
  family: string;
  summary: string;
  description: string;
  culturalContext: string;
  image: string;
  model: string;
  arCard: string;
  sound: string;
  arTargetIndex: number;
  references: InstrumentReference[];
}

export type PageKey = 'home' | 'ar' | 'calibration' | 'library' | 'details';

export interface CalibrationSettings {
  rotationSensitivity: number;
  movementSensitivity: number;
  scaleSensitivity: number;
  smoothing: number;
}

export interface GestureDelta {
  rotation: number;
  tilt: number;
  scaleFactor: number;
}

export const DEFAULT_CALIBRATION: CalibrationSettings = {
  rotationSensitivity: 1,
  movementSensitivity: 1,
  scaleSensitivity: 1,
  smoothing: 0.72,
};
