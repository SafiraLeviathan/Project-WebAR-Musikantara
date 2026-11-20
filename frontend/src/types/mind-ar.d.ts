declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type * as THREE from 'three';

  export interface MindARAnchor {
    group: THREE.Group;
    onTargetFound?: () => void;
    onTargetLost?: () => void;
  }

  export class MindARThree {
    constructor(options: {
      container: HTMLElement;
      imageTargetSrc: string;
      maxTrack?: number;
      filterMinCF?: number;
      filterBeta?: number;
      warmupTolerance?: number;
      missTolerance?: number;
      userDeviceId?: string;
      environmentDeviceId?: string;
      uiLoading?: 'yes' | 'no' | string;
      uiScanning?: 'yes' | 'no' | string;
      uiError?: 'yes' | 'no' | string;
    });
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.Camera;
    addAnchor(targetIndex: number): MindARAnchor;
    start(): Promise<void>;
    stop(): void;
    switchCamera(): void;
  }
}
