import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface ThreeViewportProps {
  modelUrl?: string;
  dummy?: boolean;
  className?: string;
  onObjectReady?: (object: THREE.Group) => void;
  autoRotate?: boolean;
}

function createDummy(): THREE.Group {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd6a079, roughness: 0.72 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x334b49, roughness: 0.8 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xd97843, roughness: 0.64 });
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.86 }));
  ground.position.y = -1.12;
  group.add(ground);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.62, 6, 16), cloth);
  torso.position.y = -0.12;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 24), skin);
  head.position.y = 0.72;
  group.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 12), skin);
  neck.position.y = 0.48;
  group.add(neck);
  const armGeometry = new THREE.CapsuleGeometry(0.085, 0.48, 4, 10);
  const leftArm = new THREE.Mesh(armGeometry, skin);
  leftArm.position.set(-0.43, 0.05, 0);
  leftArm.rotation.z = -0.72;
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeometry, skin);
  rightArm.position.set(0.43, 0.05, 0);
  rightArm.rotation.z = 0.72;
  group.add(rightArm);
  const legGeometry = new THREE.CapsuleGeometry(0.11, 0.48, 4, 10);
  const leftLeg = new THREE.Mesh(legGeometry, cloth);
  leftLeg.position.set(-0.16, -0.76, 0);
  leftLeg.rotation.z = -0.06;
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeometry, cloth);
  rightLeg.position.set(0.16, -0.76, 0);
  rightLeg.rotation.z = 0.06;
  group.add(rightLeg);
  const marker = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 36), accent);
  marker.rotation.x = Math.PI / 2;
  marker.position.y = -1.04;
  group.add(marker);
  group.scale.setScalar(0.9);
  return group;
}

export function ThreeViewport({ modelUrl, dummy = false, className, onObjectReady, autoRotate = false }: ThreeViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onObjectReady);
  callbackRef.current = onObjectReady;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.2, 4.7);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4b9a6, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xd7e9e4, 0.8);
    fillLight.position.set(-4, 1, 2);
    scene.add(fillLight);

    const root = new THREE.Group();
    scene.add(root);
    callbackRef.current?.(root);

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let content: THREE.Object3D;
    if (dummy) {
      content = createDummy();
      root.add(content);
    } else if (modelUrl) {
      new GLTFLoader().load(modelUrl, (gltf) => {
        if (disposed) {
          gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
          return;
        }
        content = gltf.scene;
        content.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(content);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const largest = Math.max(size.x, size.y, size.z) || 1;
        content.position.sub(center);
        content.scale.setScalar(2.35 / largest);
        root.add(content);
      }, undefined, (error) => {
        console.error(`Gagal memuat model 3D ${modelUrl}`, error);
      });
    }

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      if (autoRotate) root.rotation.y = Math.sin(clock.getElapsedTime() * 0.34) * 0.12;
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.domElement.remove();
      scene.clear();
    };
  }, [modelUrl, dummy, autoRotate]);

  return <div ref={containerRef} className={className ?? 'three-viewport'} aria-label={dummy ? 'Pratinjau model dummy 3D' : 'Pratinjau model alat musik 3D'} />;
}
