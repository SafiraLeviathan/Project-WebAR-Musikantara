<script setup lang="ts">
import { ref, watch } from 'vue';
import type { GestureFrame } from '../types/gesture';
import ThreePreview from './ThreePreview.vue';

const props = defineProps<{
  gestureEnabled: boolean;
  gestureSensitivity: number;
  viewerSensitivity: number;
  gesture: GestureFrame | null;
  sensorStatus: string;
  handsCount: number;
}>();

const emit = defineEmits<{
  toggleGesture: [];
  updateGestureSensitivity: [value: number];
  updateViewerSensitivity: [value: number];
}>();

const controlMode = ref<'navigation' | 'move' | 'rotate' | 'scale'>('navigation');
watch(() => props.gestureEnabled, () => { controlMode.value = 'navigation'; });
</script>

<template>
  <section class="settings-view page-view">
    <header class="page-heading">
      <div><p class="eyebrow">KALIBRASI</p><h1>Pengaturan kontrol</h1><p>Uji gerakan model dan atur tingkat respons kontrol.</p></div>
      <div class="session-note">Pengaturan hanya berlaku selama tab ini terbuka.</div>
    </header>

    <div class="settings-layout">
      <section class="preview-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">MODEL UJI</p><h2>Dummy 3D</h2></div>
          <span class="model-live"><i></i> Interaktif</span>
        </div>
        <div class="preview-stage">
          <ThreePreview
            :gesture-enabled="gestureEnabled"
            :gesture-sensitivity="gestureSensitivity"
            :viewer-sensitivity="viewerSensitivity"
            :gesture="gesture"
            :control-mode="controlMode"
          />
        </div>
        <div class="viewer-controls" :class="{ 'viewer-controls--locked': gestureEnabled }">
          <button :class="{ selected: controlMode === 'navigation' }" :disabled="gestureEnabled" @click="controlMode = 'navigation'">Navigasi</button>
          <button :class="{ selected: controlMode === 'move' }" :disabled="gestureEnabled" @click="controlMode = 'move'">Geser</button>
          <button :class="{ selected: controlMode === 'rotate' }" :disabled="gestureEnabled" @click="controlMode = 'rotate'">Putar</button>
          <button :class="{ selected: controlMode === 'scale' }" :disabled="gestureEnabled" @click="controlMode = 'scale'">Skala</button>
        </div>
        <p class="control-help">Navigasi: seret untuk memutar, klik kanan atau dua jari untuk pan, scroll atau cubit untuk zoom. Pilih Geser, Putar, atau Skala untuk memakai gizmo 3D.</p>
      </section>

      <aside class="setting-panel">
        <div class="setting-block gesture-block">
          <div class="setting-title-row">
            <div><p class="eyebrow">MODE KONTROL</p><h2>Gestur tangan</h2></div>
            <button class="toggle" :class="{ 'toggle--on': gestureEnabled }" role="switch" :aria-checked="gestureEnabled" @click="emit('toggleGesture')"><span></span></button>
          </div>
          <p class="setting-description">Saat aktif, navigasi dan transformasi dengan mouse atau layar sentuh dinonaktifkan.</p>
          <div class="sensor-status" :class="{ 'sensor-status--on': gestureEnabled && handsCount > 0 }">
            <span class="sensor-dot"></span>
            <span>{{ sensorStatus.startsWith('Sensor gestur tidak tersedia:') || sensorStatus.startsWith('Browser ini tidak menyediakan akses kamera') ? sensorStatus : gestureEnabled ? sensorStatus : 'Sensor gestur nonaktif' }}</span>
          </div>
          <div class="hand-count"><strong>{{ handsCount }}</strong><span>{{ handsCount === 1 ? 'tangan terdeteksi' : 'tangan terdeteksi' }}</span></div>
          <div class="gesture-instructions">
            <div><span class="gesture-symbol">1</span><p><strong>Satu tangan</strong><small>Geser posisi, putar pergelangan, cubit untuk mengubah ukuran.</small></p></div>
            <div><span class="gesture-symbol">2</span><p><strong>Dua tangan</strong><small>Gerakkan titik tengah untuk pan, ubah jarak untuk skala, putar arah kedua tangan untuk rotasi.</small></p></div>
          </div>
          <label class="range-label"><span>Sensitivitas gestur</span><strong>{{ gestureSensitivity.toFixed(1) }}×</strong></label>
          <input class="range-input" type="range" min="0.5" max="2.5" step="0.1" :value="gestureSensitivity" @input="emit('updateGestureSensitivity', Number(($event.target as HTMLInputElement).value))" />
          <div class="range-scale"><span>Rendah</span><span>Tinggi</span></div>
        </div>

        <div class="setting-divider"></div>

        <div class="setting-block">
          <div class="setting-title-row"><div><p class="eyebrow">MOUSE & TOUCHSCREEN</p><h2>Kontrol 3D Viewer</h2></div><span class="setting-value">{{ viewerSensitivity.toFixed(1) }}×</span></div>
          <p class="setting-description">Mengatur kecepatan navigasi dan respons transformasi model.</p>
          <label class="range-label"><span>Sensitivitas kontrol</span><strong>{{ viewerSensitivity.toFixed(1) }}×</strong></label>
          <input class="range-input" type="range" min="0.5" max="2.5" step="0.1" :value="viewerSensitivity" @input="emit('updateViewerSensitivity', Number(($event.target as HTMLInputElement).value))" />
          <div class="range-scale"><span>Rendah</span><span>Tinggi</span></div>
        </div>

        <p class="privacy-note">Video diproses di perangkat dan tidak ditampilkan. MediaPipe dapat mengirim metrik penggunaan, bukan frame video.</p>
      </aside>
    </div>
  </section>
</template>
