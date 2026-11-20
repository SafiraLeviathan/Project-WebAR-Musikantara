<script setup lang="ts">
import { INSTRUMENTS } from '../data/instruments';
const emit = defineEmits<{
  navigate: [page: 'scan' | 'settings' | 'repository'];
  selectInstrument: [id: string];
}>();
</script>

<template>
  <section class="home-view page-view">
    <div class="home-heading">
      <div>
        <p class="eyebrow">RUANG BELAJAR MUSIK NUSANTARA</p>
        <h1>Kenali bunyi, bentuk, dan cara memainkan alat musik Indonesia.</h1>
        <p class="home-description">Jelajahi instrumen tradisional melalui kartu AR dan model 3D interaktif.</p>
      </div>
      <div class="home-mark" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    </div>

    <div class="home-actions">
      <button class="home-action home-action--primary" @click="emit('navigate', 'scan')">
        <span class="action-index">01</span>
        <span class="action-copy"><strong>Scan AR</strong><small>Arahkan kamera ke kartu alat musik</small></span>
        <span class="action-arrow">↗</span>
      </button>
      <button class="home-action" @click="emit('navigate', 'repository')">
        <span class="action-index">02</span>
        <span class="action-copy"><strong>Repositori alat musik</strong><small>Baca asal, cara memainkan, dan dengarkan suara</small></span>
        <span class="action-arrow">↗</span>
      </button>
      <button class="home-action" @click="emit('navigate', 'settings')">
        <span class="action-index">03</span>
        <span class="action-copy"><strong>Pengaturan kontrol</strong><small>Uji navigasi 3D dan sensor gestur tangan</small></span>
        <span class="action-arrow">↗</span>
      </button>
    </div>

    <div class="home-instruments">
      <div class="section-heading">
        <div><p class="eyebrow">KOLEKSI</p><h2>Lima instrumen pilihan</h2></div>
        <button class="text-link" @click="emit('navigate', 'repository')">Buka repositori <span>↗</span></button>
      </div>
      <div class="instrument-strip">
        <button v-for="(instrument, index) in INSTRUMENTS" :key="instrument.id" class="instrument-chip" @click="emit('selectInstrument', instrument.id); emit('navigate', 'repository')">
          <span class="chip-number">0{{ index + 1 }}</span>
          <span>{{ instrument.name }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
