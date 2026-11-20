export interface GestureFrame {
  x: number;
  y: number;
  angle: number;
  distance: number;
  handCount: 1 | 2;
  timestamp: number;
}

export type GestureStatus = 'idle' | 'starting' | 'ready' | 'error';
