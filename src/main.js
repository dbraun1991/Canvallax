import Alpine from 'alpinejs';
import { shellState } from './shell/shell-state.js';
import './css/theme.css';
import './css/shell.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

window.Alpine = Alpine;
Alpine.data('shell', shellState);
Alpine.start();
