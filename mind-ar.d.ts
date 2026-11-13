declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  export class MindARThree {
    constructor(options: {
      container: HTMLElement;
      imageTargetSrc: string;
      maxTrack?: number;
      uiLoading?: 'yes' | 'no';
      uiScanning?: 'yes' | 'no';
      uiError?: 'yes' | 'no';
      filterMinCF?: number;
      filterBeta?: number;
      userDeviceId?: string | null;
      environmentDeviceId?: string | null;
    });
    container: HTMLElement;
    video: HTMLVideoElement;
    shouldFaceUser: boolean;
    controller: { dispose: () => void; stopProcessVideo: () => void };
    renderer: import('three').WebGLRenderer;
    scene: import('three').Scene;
    camera: import('three').PerspectiveCamera;
    addAnchor(targetIndex: number): {
      group: import('three').Group;
      onTargetFound: (() => void) | null;
      onTargetLost: (() => void) | null;
      onTargetUpdate: (() => void) | null;
    };
    start(): Promise<void>;
    stop(): void;
    resize(): void;
  }
}
