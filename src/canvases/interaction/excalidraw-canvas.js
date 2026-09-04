import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw, exportToSvg, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const SAVE_DEBOUNCE_MS = 800;

function parseScene(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse Excalidraw scene', error);
    return null;
  }
}

// ADR-0021: Excalidraw is a React component; the shell is Alpine.js (ADR-0002).
// Rather than adopting React as a framework, this mounts it as a single
// isolated island — a react-dom/client root created directly inside the
// given container. createElement, not JSX, so Vite needs no JSX transform
// for this — nothing else in the build config has to know this one canvas
// is React underneath.
export function mountExcalidrawCanvas(container, viewObj, onChange, theme) {
  const root = createRoot(container);
  let saveTimer = null;

  const handleChange = (elements, appState, files) => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      onChange(serializeAsJSON(elements, appState, files, 'local'));
    }, SAVE_DEBOUNCE_MS);
  };

  root.render(
    createElement(Excalidraw, {
      initialData: parseScene(viewObj.content),
      onChange: handleChange,
      theme: theme === 'dark' ? 'dark' : 'light',
    })
  );

  return {
    destroy() {
      clearTimeout(saveTimer);
      root.unmount();
    },
  };
}

// ADR-0012: one-shot SVG render for the All view. Unlike bpmn-js's thumbnail
// export, exportToSvg needs no live mounted instance or off-screen container
// at all — it renders straight from the scene data.
export async function renderExcalidrawThumbnail(content, theme) {
  const scene = parseScene(content);
  if (!scene || !scene.elements || scene.elements.length === 0) return '';

  const svg = await exportToSvg({
    elements: scene.elements,
    appState: { ...scene.appState, theme: theme === 'dark' ? 'dark' : 'light', exportBackground: false },
    files: scene.files || null,
  });
  return svg.outerHTML;
}
