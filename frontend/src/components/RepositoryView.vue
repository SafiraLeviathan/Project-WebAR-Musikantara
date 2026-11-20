<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { INSTRUMENTS, getInstrument } from '../data/instruments';

const props = defineProps<{ selectedInstrumentId: string }>();
const emit = defineEmits<{
  tryScan: [id: string];
}>();

const selectedId = ref(props.selectedInstrumentId || 'angklung');
const playing = ref(false);
let audio: HTMLAudioElement | null = null;
const selected = computed(() => getInstrument(selectedId.value));
onBeforeUnmount(stopAudio);

watch(() => props.selectedInstrumentId, (id) => {
  if (id) selectedId.value = id;
});

function selectInstrument(id: string): void {
  stopAudio();
  selectedId.value = id;
}

function stopAudio(): void {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
  }
  playing.value = false;
}

async function toggleAudio(): Promise<void> {
  if (playing.value) {
    stopAudio();
    return;
  }
  stopAudio();
  audio = new Audio(selected.value.audio);
  audio.addEventListener('ended', () => { playing.value = false; }, { once: true });
  audio.addEventListener('error', () => { playing.value = false; }, { once: true });
  try {
    await audio.play();
    playing.value = true;
  } catch {
    playing.value = false;
  }
}
</script>

<template>
  <section class="repository-view page-view">
    <header class="page-heading">
      <div><p class="eyebrow">ENSIKLOPEDIA</p><h1>Repositori alat musik</h1><p>Pilih instrumen untuk melihat bentuk, penjelasan, dan contoh suaranya.</p></div>
      <span class="collection-count">05 INSTRUMEN</span>
    </header>

    <div class="repository-layout">
      <nav class="instrument-list" aria-label="Daftar alat musik">
        <button v-for="(instrument, index) in INSTRUMENTS" :key="instrument.id" :class="{ active: selectedId === instrument.id }" @click="selectInstrument(instrument.id)">
          <span class="list-number">0{{ index + 1 }}</span>
          <span>{{ instrument.name }}</span>
          <span class="list-chevron">↗</span>
        </button>
      </nav>

      <article class="instrument-detail" :key="selected.id">
        <div class="detail-visual">
          <span class="visual-label">{{ selected.family }}</span>
          <img class="instrument-art" :src="selected.image" :alt="`Ilustrasi ${selected.name}`" />
          <div class="visual-footer"><span>{{ selected.region }}</span><span>Musikantara / {{ selected.name }}</span></div>
        </div>

        <div class="detail-content">
          <div class="detail-heading"><div><p class="eyebrow">ALAT MUSIK TRADISIONAL</p><h2>{{ selected.name }}</h2></div><span class="detail-origin">{{ selected.region }}</span></div>
          <p class="detail-description">{{ selected.description }}</p>
          <div class="learning-section"><p class="eyebrow">CARA MEMAINKAN</p><p>{{ selected.playingMethod }}</p></div>
          <div class="learning-section learning-section--note"><p class="eyebrow">CATATAN BELAJAR</p><p>{{ selected.learningNote }}</p></div>

          <div class="ar-card-row">
            <div><p class="eyebrow">KARTU AR</p><span>Tunjukkan kartu ini ke kamera untuk melihat model 3D.</span></div>
            <img :src="selected.arCard" :alt="`Kartu AR ${selected.name}`" />
          </div>

          <div class="detail-actions">
            <button class="listen-button" @click="toggleAudio">
              <svg viewBox="0 0 24 24"><path d="M4 10v4h3l4 3V7l-4 3H4Z"/><path d="M15 9.5a5 5 0 0 1 0 5M17.5 7a8.5 8.5 0 0 1 0 10"/></svg>
              {{ playing ? 'Hentikan suara' : 'Putar suara' }}
            </button>
            <button class="scan-button" @click="emit('tryScan', selected.id)">Coba Scan AR <span>↗</span></button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
