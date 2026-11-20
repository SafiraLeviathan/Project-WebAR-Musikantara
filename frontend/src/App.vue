<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import HomeView from './components/HomeView.vue';
import ScanAR from './components/ScanAR.vue';
import SettingsView from './components/SettingsView.vue';
import RepositoryView from './components/RepositoryView.vue';
import HandTrackingSensor from './components/HandTrackingSensor.vue';
import type { GestureFrame } from './types/gesture';

type Page = 'home' | 'scan' | 'settings' | 'repository';
const page = ref<Page>('home');
const cameraEnabled = ref(false);
const gestureEnabled = ref(false);
const gestureSensitivity = ref(1.2);
const viewerSensitivity = ref(1.0);
const selectedInstrumentId = ref('angklung');
const gestureFrame = ref<GestureFrame | null>(null);
const sensorStatus = ref('Sensor gestur nonaktif');
const handsCount = ref(0);
const apiStatus = ref<'checking' | 'online' | 'offline'>('checking');

const sensorActive = computed(() => gestureEnabled.value && (
  page.value === 'settings' || (page.value === 'scan' && cameraEnabled.value)
));
const pageTitle = computed(() => ({
  home: 'Beranda',
  scan: 'Scan AR',
  settings: 'Pengaturan kontrol',
  repository: 'Repositori alat musik'
})[page.value]);

const navigation = [
  { id: 'home' as const, label: 'Beranda', icon: 'home' },
  { id: 'scan' as const, label: 'Scan AR', icon: 'scan' },
  { id: 'settings' as const, label: 'Pengaturan kontrol', icon: 'sliders' },
  { id: 'repository' as const, label: 'Repositori alat musik', icon: 'library' }
];

function navigate(next: Page): void {
  cameraEnabled.value = next === 'scan';
  if (next !== page.value) gestureFrame.value = null;
  page.value = next;
}

function openRepository(id: string): void {
  selectedInstrumentId.value = id;
  navigate('repository');
}

function toggleCamera(): void {
  cameraEnabled.value = !cameraEnabled.value;
  if (!cameraEnabled.value) gestureFrame.value = null;
}

function toggleGesture(): void {
  gestureEnabled.value = !gestureEnabled.value;
  if (!gestureEnabled.value) {
    gestureFrame.value = null;
    handsCount.value = 0;
    sensorStatus.value = 'Sensor gestur nonaktif';
  }
}

function onDetected(id: string | null): void {
  if (id) selectedInstrumentId.value = id;
}

function onGesture(frame: GestureFrame | null): void {
  gestureFrame.value = frame;
}

function onSensorStatus(message: string): void {
  sensorStatus.value = message;
  const sensorFailed = message.startsWith('Sensor gestur tidak tersedia:')
    || message.startsWith('Browser ini tidak menyediakan akses kamera');
  if (sensorFailed) {
    // Restore standard mouse/touch controls automatically when the sensor
    // cannot start or stops while processing a camera frame.
    gestureEnabled.value = false;
    gestureFrame.value = null;
    handsCount.value = 0;
  }
}

async function checkApi(): Promise<void> {
  try {
    const response = await fetch('/api/health', { headers: { accept: 'application/json' } });
    apiStatus.value = response.ok ? 'online' : 'offline';
    if (response.ok) {
    }
  } catch {
    apiStatus.value = 'offline';
  }
}

onMounted(() => void checkApi());
watch(() => [page.value, gestureEnabled.value, cameraEnabled.value] as const, () => {
  if (!sensorActive.value) {
    gestureFrame.value = null;
    handsCount.value = 0;
    const hasSensorError = sensorStatus.value.startsWith('Sensor gestur tidak tersedia:')
      || sensorStatus.value.startsWith('Browser ini tidak menyediakan akses kamera');
    if (!hasSensorError) {
      sensorStatus.value = gestureEnabled.value ? 'Sensor menunggu halaman kontrol aktif' : 'Sensor gestur nonaktif';
    }
  }
});
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--scan': page === 'scan' }">
    <aside v-if="page !== 'scan'" class="desktop-sidebar">
      <button class="brand-lockup" @click="navigate('home')" aria-label="Musikantara beranda">
        <span class="brand-symbol"><i></i><i></i><i></i></span>
        <span class="brand-name">musikantara<small>WEB AR EXPERIENCE</small></span>
      </button>

      <div class="nav-caption">MENU UTAMA</div>
      <nav class="main-navigation" aria-label="Menu utama">
        <button v-for="item in navigation" :key="item.id" :class="{ active: page === item.id }" @click="navigate(item.id)">
          <span class="nav-icon" aria-hidden="true">
            <svg v-if="item.icon === 'home'" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/></svg>
            <svg v-else-if="item.icon === 'scan'" viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/></svg>
            <svg v-else-if="item.icon === 'sliders'" viewBox="0 0 24 24"><path d="M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>
            <svg v-else viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M4 6h12M8 10h8M8 14h6"/></svg>
          </span>
          <span>{{ item.label }}</span>
          <span v-if="page === item.id" class="nav-indicator"></span>
        </button>
      </nav>

      <div class="sidebar-bottom">
        <div class="sidebar-status"><span :class="`api-dot api-dot--${apiStatus}`"></span><span>{{ apiStatus === 'online' ? 'Layanan aktif' : apiStatus === 'checking' ? 'Memeriksa layanan' : 'Mode lokal' }}</span></div>
        <span class="sidebar-version">MUSIKANTARA · 1.0.6</span>
      </div>
    </aside>

    <main class="app-main">
      <header v-if="page !== 'scan'" class="topbar">
        <div class="breadcrumbs"><span>Musikantara</span><span class="breadcrumb-separator">/</span><strong>{{ pageTitle }}</strong></div>
        <div class="topbar-right"><span class="no-account">Tanpa akun</span><span class="topbar-divider"></span><span class="topbar-status"><i></i> Siap digunakan</span></div>
      </header>

      <div class="page-container" :class="`page-container--${page}`">
        <HomeView v-if="page === 'home'" @navigate="navigate" @select-instrument="selectedInstrumentId = $event" />
        <ScanAR
          v-else-if="page === 'scan'"
          :camera-enabled="cameraEnabled"
          :gesture-enabled="gestureEnabled"
          :gesture-sensitivity="gestureSensitivity"
          :viewer-sensitivity="viewerSensitivity"
          :gesture="gestureFrame"
          :sensor-status="sensorStatus"
          @toggle-camera="toggleCamera"
          @toggle-gesture="toggleGesture"
          @detected="onDetected"
          @open-detail="openRepository"
          @exit="navigate('home')"
        />
        <SettingsView
          v-else-if="page === 'settings'"
          :gesture-enabled="gestureEnabled"
          :gesture-sensitivity="gestureSensitivity"
          :viewer-sensitivity="viewerSensitivity"
          :gesture="gestureFrame"
          :sensor-status="sensorStatus"
          :hands-count="handsCount"
          @toggle-gesture="toggleGesture"
          @update-gesture-sensitivity="gestureSensitivity = $event"
          @update-viewer-sensitivity="viewerSensitivity = $event"
        />
        <RepositoryView v-else :selected-instrument-id="selectedInstrumentId" @try-scan="(id) => { selectedInstrumentId = id; navigate('scan'); }" />
      </div>
    </main>

    <nav v-if="page !== 'scan'" class="mobile-navigation" aria-label="Navigasi">
      <button v-for="item in navigation" :key="item.id" :class="{ active: page === item.id }" @click="navigate(item.id)">
        <span class="mobile-nav-icon" aria-hidden="true">
          <svg v-if="item.icon === 'home'" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/></svg>
          <svg v-else-if="item.icon === 'scan'" viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/></svg>
          <svg v-else-if="item.icon === 'sliders'" viewBox="0 0 24 24"><path d="M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M4 6h12M8 10h8M8 14h6"/></svg>
        </span>
        <span>{{ item.id === 'settings' ? 'Kontrol' : item.id === 'repository' ? 'Repositori' : item.label }}</span>
      </button>
    </nav>

    <HandTrackingSensor
      v-if="sensorActive"
      @gesture="onGesture"
      @status="onSensorStatus"
      @hands="handsCount = $event"
    />
    <span class="sr-only" aria-live="polite">{{ sensorStatus }}</span>
  </div>
</template>
