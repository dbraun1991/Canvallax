import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import { starterDiagram } from './starter-diagram.js';

// Synchronous: creates the Modeler and returns a destroy handle immediately.
// importXML runs in the background rather than being awaited, so the handle
// is available to the caller (shell-state.js) right away, before the
// diagram has actually finished loading.
export function mountProcessCanvas(canvasEl, propertiesEl, viewObj, onChange) {
  const modeler = new BpmnModeler({
    container: canvasEl,
    propertiesPanel: { parent: propertiesEl },
    additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule],
  });

  let destroyed = false;

  modeler
    .importXML(viewObj.content || starterDiagram)
    .then(() => {
      if (destroyed) return;
      // fit-viewport both sizes and centers the diagram in the canvas —
      // otherwise it opens at 100% zoom, anchored top-left, which for
      // anything bigger than a couple of elements means scrolling to even
      // see the whole thing on entry. Two things are both required here,
      // not one:
      //  1. canvas.resized() — diagram-js's Canvas.viewbox() caches its
      //     result (this._cachedViewbox) after the first call, which can
      //     happen internally during import while the container (still
      //     mid-transition out of shell-state.js's x-show display:none) was
      //     0x0. Without resized() clearing that cache, fit-viewport keeps
      //     reusing the stale {0,0} box forever, no matter how long we wait.
      //  2. A double requestAnimationFrame before calling it — a single
      //     frame wasn't reliably enough in testing for the container's own
      //     multi-level percentage-sized wrapper chain (bpmn-js's own
      //     .bjs-container/.djs-container) to have settled its real layout.
      // Skipping either one reproduces the same failure: fit-viewport's
      // math divides by that stale/zero size, throwing (SVGMatrix.scale
      // with a non-finite value) rather than no-op-ing.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (destroyed) return;
          const canvas = modeler.get('canvas');
          canvas.resized();
          canvas.zoom('fit-viewport');
        });
      });
    })
    .catch((error) => {
      console.error('Failed to import BPMN diagram', error);
    });

  modeler.on('commandStack.changed', async () => {
    if (destroyed) return; // may fire while saveXML was pending after destroy
    try {
      const { xml } = await modeler.saveXML({ format: false });
      onChange(xml);
    } catch (error) {
      console.error('Failed to save BPMN diagram', error);
    }
  });

  return {
    destroy() {
      destroyed = true;
      modeler.destroy();
    },
  };
}

// ADR-0012: one-shot SVG render for the All view. The container must be
// positioned off-screen, not display:none — saveSVG() internally measures
// the diagram via getBBox(), which needs real layout to have happened.
export async function renderProcessThumbnail(xml) {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '300px';
  container.style.height = '200px';
  document.body.appendChild(container);

  const viewer = new BpmnViewer({ container });

  try {
    await viewer.importXML(xml || starterDiagram);
    const { svg } = await viewer.saveSVG();
    return svg;
  } finally {
    viewer.destroy();
    container.remove();
  }
}
