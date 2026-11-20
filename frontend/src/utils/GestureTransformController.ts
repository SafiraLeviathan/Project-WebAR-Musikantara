import type { Object3D } from 'three';
import type { GestureFrame } from '../types/gesture';

function wrappedAngleDelta(current: number, previous: number): number {
  let delta = current - previous;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function deadZone(value: number, threshold: number): number {
  return Math.abs(value) < threshold ? 0 : value;
}

/** Converts smoothed hand landmarks into small, cumulative 3D transform deltas. */
export class GestureTransformController {
  private previous: GestureFrame | null = null;
  private baseScale = 1;

  reset(): void {
    this.previous = null;
  }

  apply(object: Object3D, frame: GestureFrame, sensitivity: number): void {
    const safeSensitivity = Math.max(0.2, Math.min(3, sensitivity));

    if (!this.previous || this.previous.handCount !== frame.handCount) {
      this.previous = frame;
      this.baseScale = object.scale.x;
      return;
    }

    const dx = deadZone(frame.x - this.previous.x, 0.0025);
    const dy = deadZone(frame.y - this.previous.y, 0.0025);
    const angleDelta = deadZone(wrappedAngleDelta(frame.angle, this.previous.angle), 0.008);

    object.position.x += dx * safeSensitivity * 1.35;
    object.position.y -= dy * safeSensitivity * 1.35;
    object.rotation.z += angleDelta * safeSensitivity;

    const rawRatio = frame.distance / Math.max(0.012, this.previous.distance);
    const boundedRatio = Math.max(0.92, Math.min(1.08, rawRatio));
    const factor = 1 + (boundedRatio - 1) * safeSensitivity;
    const nextScale = Math.max(this.baseScale * 0.35, Math.min(this.baseScale * 2.7, object.scale.x * factor));
    object.scale.setScalar(nextScale);

    this.previous = frame;
  }
}
