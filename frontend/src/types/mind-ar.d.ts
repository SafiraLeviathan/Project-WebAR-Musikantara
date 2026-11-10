declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type { Camera, Group, Scene, WebGLRenderer } from 'three'

  export interface MindARAnchor {
    group: Group
    onTargetFound?: () => void
    onTargetLost?: () => void
  }

  export class MindARThree {
    constructor(options: {
      container: HTMLElement
      imageTargetSrc: string
      maxTrack?: number
      filterMinCF?: number
      filterBeta?: number
      videoSettings?: MediaTrackConstraints
    })
    renderer: WebGLRenderer
    scene: Scene
    camera: Camera
    addAnchor(targetIndex: number): MindARAnchor
    start(): Promise<void>
    stop(): void
  }
}
