import { useCallback, useState } from 'react';
import { DEFAULT_CALIBRATION, type CalibrationSettings } from '../types/app';

const STORAGE_KEY = 'musikantara.calibration.v1';

function readSessionSettings(): CalibrationSettings {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (!value) return DEFAULT_CALIBRATION;
    const parsed = JSON.parse(value) as Partial<CalibrationSettings>;
    return {
      rotationSensitivity: clamp(parsed.rotationSensitivity, 0.2, 2.5, DEFAULT_CALIBRATION.rotationSensitivity),
      movementSensitivity: clamp(parsed.movementSensitivity, 0.2, 2.5, DEFAULT_CALIBRATION.movementSensitivity),
      scaleSensitivity: clamp(parsed.scaleSensitivity, 0.2, 2.5, DEFAULT_CALIBRATION.scaleSensitivity),
      smoothing: clamp(parsed.smoothing, 0.1, 0.95, DEFAULT_CALIBRATION.smoothing),
    };
  } catch {
    return DEFAULT_CALIBRATION;
  }
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function useCalibrationSettings() {
  const [settings, setSettings] = useState<CalibrationSettings>(readSessionSettings);

  const update = useCallback((patch: Partial<CalibrationSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const save = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }, [settings]);

  const reset = useCallback(() => {
    setSettings(DEFAULT_CALIBRATION);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CALIBRATION));
    } catch {
      // The in-memory default remains active for this session.
    }
  }, []);

  return { settings, update, save, reset };
}
