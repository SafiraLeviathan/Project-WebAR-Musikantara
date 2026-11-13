import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyGestureTransform } from '../../apps/web/src/features/gestures/transform';

describe('applyGestureTransform', () => {
  it('converts movement into rotation and tilt', () => {
    const model = new THREE.Group();
    applyGestureTransform(model, { rotation: 0.2, tilt: 0.1, scaleFactor: 1 });
    expect(model.rotation.y).toBeCloseTo(-0.2);
    expect(model.rotation.x).toBeCloseTo(0.1);
  });

  it('limits tilt and wraps horizontal rotation', () => {
    const model = new THREE.Group();
    applyGestureTransform(model, { rotation: 0, tilt: 8, scaleFactor: 1 });
    expect(model.rotation.x).toBeCloseTo(1.2);
    applyGestureTransform(model, { rotation: -8, tilt: -8, scaleFactor: 1 });
    expect(model.rotation.x).toBeCloseTo(-1.2);
    expect(model.rotation.y).toBeGreaterThanOrEqual(-Math.PI);
    expect(model.rotation.y).toBeLessThan(Math.PI);
  });

  it('limits model scale to a safe range', () => {
    const model = new THREE.Group();
    applyGestureTransform(model, { rotation: 0, tilt: 0, scaleFactor: 20 });
    expect(model.scale.x).toBe(1.65);
    applyGestureTransform(model, { rotation: 0, tilt: 0, scaleFactor: 0.01 });
    expect(model.scale.x).toBe(0.55);
  });
});
