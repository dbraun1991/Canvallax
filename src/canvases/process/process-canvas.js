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

  modeler.importXML(viewObj.content || starterDiagram).catch((error) => {
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
