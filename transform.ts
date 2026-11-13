import * as THREE from 'three';
import type { GestureDelta } from '../../types/app';

export function applyGestureTransform(root: THREE.Group, delta: GestureDelta): void {
  const fullTurn = Math.PI * 2;
  const yaw = THREE.MathUtils.euclideanModulo(root.rotation.y - delta.rotation + Math.PI, fullTurn) - Math.PI;
  root.rotation.y = yaw;
  root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + delta.tilt, -1.2, 1.2);
  const nextScale = THREE.MathUtils.clamp(root.scale.x * delta.scaleFactor, 0.55, 1.65);
  root.scale.setScalar(nextScale);
}
