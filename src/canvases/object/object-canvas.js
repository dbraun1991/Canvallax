import mermaid from 'mermaid';
import { starterDiagram } from './starter-diagram.js';

let renderCounter = 0;

const DEBOUNCE_MS = 400;

export function mountObjectCanvas(container, viewObj, onChange, theme) {
  // securityLevel: 'strict' sanitizes any HTML embedded in diagram labels —
  // relevant since the diagram source is arbitrary user input. Re-called on
  // every mount (ADR-0013) since only one Object canvas is ever active and
  // initialize() just sets global config for the render() calls below —
  // applied at mount time only, not live if the shell's theme changes while
  // this view is already open (matches draw.io's same limitation).
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : 'default',
  });

  container.innerHTML = `
    <div class="object-canvas-layout">
      <textarea class="object-canvas-source" spellcheck="false"></textarea>
      <div class="object-canvas-preview"></div>
    </div>
  `;

  const textarea = container.querySelector('.object-canvas-source');
  const preview = container.querySelector('.object-canvas-preview');
  textarea.value = viewObj.content || starterDiagram;

  let debounceTimer = null;

  const renderPreview = async () => {
    const text = textarea.value;
    onChange(text);
    try {
      const id = `mermaid-preview-${renderCounter++}`;
      const { svg } = await mermaid.render(id, text);
      preview.innerHTML = svg;
    } catch (error) {
      // Expected mid-edit while the user types invalid/incomplete syntax —
      // not a bug, just show it rather than leaving a stale preview.
      preview.innerHTML = '<p class="object-canvas-error">Invalid diagram syntax</p>';
    }
  };

  const onInput = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderPreview, DEBOUNCE_MS);
  };

  textarea.addEventListener('input', onInput);
  renderPreview();

  return {
    destroy() {
      clearTimeout(debounceTimer);
      textarea.removeEventListener('input', onInput);
      container.innerHTML = '';
    },
  };
}

// ADR-0012: one-shot SVG render for the All view — same mermaid.render call
// the live preview above uses, no separate viewer needed (Mermaid already
// returns raw SVG markup directly).
export async function renderObjectThumbnail(text, theme) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : 'default',
  });

  try {
    const id = `mermaid-thumbnail-${renderCounter++}`;
    const { svg } = await mermaid.render(id, text || starterDiagram);
    return svg;
  } catch (error) {
    return '<p class="object-canvas-error">Invalid diagram syntax</p>';
  }
}
