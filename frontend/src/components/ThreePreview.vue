<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { GestureFrame } from '../types/gesture';
import { GestureTransformController } from '../utils/GestureTransformController';

const props = withDefaults(defineProps<{
  gestureEnabled: boolean;
  gestureSensitivity: number;
  viewerSensitivity: number;
  controlMode: 'navigation' | 'move' | 'rotate' | 'scale';
  gesture: GestureFrame | null;
}>(), {
  gesture: null,
  controlMode: 'navigation'
});

const host = ref<HTMLDivElement | null>(null);
const error = ref('');
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let orbit: OrbitControls | null = null;
let transform: TransformControls | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationId = 0;
let dummy: THREE.Group | null = null;
const gestureController = new GestureTransformController();

function makeDummy(): THREE.Group {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x9e6035, roughness: 0.62, metalness: 0.06 });
  const lightWood = new THREE.MeshStandardMaterial({ color: 0xd4aa70, roughness: 0.58 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc28a43, roughness: 0.3, metalness: 0.72 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 1.04, 32, 1), wood);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const top = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.035, 10, 40), brass);
  top.rotation.x = Math.PI / 2;
  top.position.y = 0.47;
  group.add(top);
  const bottom = top.clone();
  bottom.position.y = -0.47;
  group.add(bottom);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.025, 10, 40), lightWood);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.18;
  group.add(band);
  const lowerBand = band.clone();
  lowerBand.position.y = -0.18;
  group.add(lowerBand);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 32), brass);
  cap.position.y = 0.55;
  group.add(cap);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.12, 32), lightWood);
  base.position.y = -0.58;
  group.add(base);
  return group;
}

function syncControls(): void {
  if (!orbit || !transform || !dummy) return;
  const gestureOn = props.gestureEnabled;
  orbit.enabled = !gestureOn;
  orbit.rotateSpeed = props.viewerSensitivity * 0.72;
  orbit.zoomSpeed = props.viewerSensitivity * 0.82;
  orbit.panSpeed = props.viewerSensitivity * 0.68;
  transform.enabled = !gestureOn;
  if (gestureOn) {
    transform.detach();
    gestureController.reset();
    return;
  }
  transform.attach(dummy);
  const mode = props.controlMode;
  if (mode === 'navigation') {
    transform.detach();
  } else {
    transform.setMode(mode === 'move' ? 'translate' : mode);
  }
}

function resize(): void {
  if (!host.value || !renderer || !camera) return;
  const width = Math.max(1, host.value.clientWidth);
  const height = Math.max(1, host.value.clientHeight);
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate(): void {
  if (!renderer || !scene || !camera) return;
  animationId = requestAnimationFrame(animate);
  orbit?.update();
  renderer.render(scene, camera);
}

function resetModel(): void {
  if (!dummy || !orbit) return;
  dummy.position.set(0, 0, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.setScalar(1);
  orbit.reset();
  gestureController.reset();
}

defineExpose({ resetModel });

onMounted(() => {
  if (!host.value) return;
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(2.7, 2.3, 4.2);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    host.value.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff4e1, 0x79614a, 2.05));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(3.8, 5.5, 4.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd1a36e, 1.15);
    fill.position.set(-4, 2, -3);
    scene.add(fill);

    dummy = makeDummy();
    scene.add(dummy);
    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.075;
    orbit.minDistance = 2.4;
    orbit.maxDistance = 8;
    orbit.target.set(0, 0, 0);
    orbit.update();

    transform = new TransformControls(camera, renderer.domElement);
    transform.setSize(0.9);
    scene.add(transform.getHelper());
    transform.addEventListener('dragging-changed', (event) => {
      if (orbit) orbit.enabled = !event.value && !props.gestureEnabled;
    });

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host.value);
    resize();
    syncControls();
    animate();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Perangkat tidak mendukung tampilan 3D WebGL.';
  }
});

watch(() => [props.gestureEnabled, props.viewerSensitivity, props.controlMode] as const, syncControls);
watch(() => props.gesture, (frame) => {
  if (!frame || !dummy || !props.gestureEnabled) {
    if (!frame) gestureController.reset();
    return;
  }
  gestureController.apply(dummy, frame, props.gestureSensitivity);
});
watch(() => props.gestureSensitivity, () => gestureController.reset());

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  resizeObserver?.disconnect();
  transform?.dispose();
  orbit?.dispose();
  renderer?.dispose();
  if (renderer?.domElement.parentElement) renderer.domElement.remove();
  scene?.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
});
</script>

<template>
  <div ref="host" class="three-preview">
    <div v-if="error" class="viewer-error">{{ error }}</div>
  </div>
</template>

<style scoped>
.three-preview {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 280px;
  overflow: hidden;
  touch-action: none;
}
.three-preview :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
  touch-action: none;
}
.viewer-error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  color: #6a3d2d;
  text-align: center;
}
</style>
