import Alpine from 'alpinejs';
import { shellState } from './shell/shell-state.js';
import { panZoom } from './shell/pan-zoom.js';
import { initI18n } from './shell/i18n.js';
import './css/theme.css';
import './css/shell.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

window.Alpine = Alpine;
Alpine.data('shell', shellState);
Alpine.data('panZoom', panZoom);

// Awaited before Alpine.start() (ADR-0026): the shell root carries x-cloak,
// so nothing renders until Alpine mounts anyway — initializing translations
// first means there's no flash of untranslated content to guard against.
initI18n(Alpine).then(() => {
  Alpine.start();
});
