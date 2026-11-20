'use strict';

// MindAR declares `canvas` for its Node-side target compiler. Musikantara loads
// the precompiled .mind file and imports MindAR's browser Three.js distribution,
// so the native node-canvas binding is not used by this application.
// Keep an explicit failure in case a future change accidentally imports it.
throw new Error(
  'Musikantara uses a precompiled MindAR .mind target. The native Node canvas compiler is not part of this browser application.'
);
