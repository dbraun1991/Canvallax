// Canvas/diagram export (agents.md Future Work). Phase 1 scope: native
// source or SVG, one view at a time — reuses each engine's existing
// render*Thumbnail function for SVG rather than adding a second, "full
// size" render path, since none of those functions actually scale their
// output down to thumbnail size (the small offscreen container some of
// them mount into only bounds where they render, not what they return).
import { renderProcessThumbnail } from './process/process-canvas.js';
import { renderDrawioThumbnail } from './system/drawio-canvas.js';
import { renderObjectThumbnail } from './object/object-canvas.js';
import { renderExcalidrawThumbnail } from './interaction/excalidraw-canvas.js';

export const NATIVE_FORMATS = {
  process: { ext: 'bpmn', mime: 'application/xml', label: 'BPMN XML (.bpmn)' },
  system: { ext: 'drawio', mime: 'application/xml', label: 'draw.io XML (.drawio)' },
  interaction: { ext: 'excalidraw', mime: 'application/json', label: 'Excalidraw JSON (.excalidraw)' },
  object: { ext: 'mmd', mime: 'text/plain', label: 'Mermaid text (.mmd)' },
};

async function svgBlobFor(view, content, theme) {
  const svgMarkup =
    view === 'process'
      ? await renderProcessThumbnail(content)
      : view === 'system'
        ? await renderDrawioThumbnail(content, theme)
        : view === 'interaction'
          ? await renderExcalidrawThumbnail(content, theme)
          : await renderObjectThumbnail(content, theme);

  return new Blob([svgMarkup], { type: 'image/svg+xml' });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Deferred, not immediate: revoking synchronously after click() has
  // dropped the download in some browsers before the click has actually
  // been processed.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportView(issue, view, format, theme) {
  const viewObj = issue.views[view];
  const safeIssueName = issue.name.trim().replace(/[^a-z0-9-_]+/gi, '-') || 'issue';

  let blob;
  let ext;
  if (format === 'native') {
    const { ext: nativeExt, mime } = NATIVE_FORMATS[view];
    blob = new Blob([viewObj.content], { type: mime });
    ext = nativeExt;
  } else {
    blob = await svgBlobFor(view, viewObj.content, theme);
    ext = 'svg';
  }

  triggerDownload(blob, `${safeIssueName}-${view}.${ext}`);
}
