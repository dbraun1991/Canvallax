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

// PNG is rasterized at this multiple of the SVG's own intrinsic size —
// sharper than a 1:1 rasterization without adding a user-facing scale
// control (Phase 2 of Canvas/diagram export, agents.md Future Work).
const PNG_EXPORT_SCALE = 2;
const PNG_FALLBACK_SIZE = { width: 800, height: 600 };

async function svgMarkupFor(view, content, theme) {
  return view === 'process'
    ? await renderProcessThumbnail(content)
    : view === 'system'
      ? await renderDrawioThumbnail(content, theme)
      : view === 'interaction'
        ? await renderExcalidrawThumbnail(content, theme)
        : await renderObjectThumbnail(content, theme);
}

// Every engine's exported SVG sets either explicit width/height or a
// viewBox (never neither) — the fallback below only matters for
// Interaction's legitimate empty-scene case (renderExcalidrawThumbnail
// returns '', not real SVG markup, when nothing's been drawn yet).
function svgIntrinsicSize(svgMarkup) {
  const svgEl = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml').documentElement;
  const width = parseFloat(svgEl.getAttribute('width'));
  const height = parseFloat(svgEl.getAttribute('height'));
  if (width > 0 && height > 0) return { width, height };

  const viewBox = (svgEl.getAttribute('viewBox') || '').split(/\s+/).map(Number);
  if (viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] };
  }
  return PNG_FALLBACK_SIZE;
}

// Rasterizes via an offscreen <canvas> — no new dependency, same reasoning
// as SVG export reusing each engine's thumbnail function instead of a
// dedicated "full size" render path. Paints a white background first: none
// of these engines' SVGs paint their own (the same reason Process/System's
// All-view tiles are pinned to a light backdrop, ADR-0025) — without it, a
// diagram's default-black elements on a transparent PNG would go invisible
// again the moment someone opens the file in a dark-themed viewer.
async function svgMarkupToPngBlob(svgMarkup) {
  const { width, height } = svgIntrinsicSize(svgMarkup);
  const canvas = document.createElement('canvas');
  canvas.width = width * PNG_EXPORT_SCALE;
  canvas.height = height * PNG_EXPORT_SCALE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Interaction's legitimate empty-scene case (no elements drawn yet) has
  // no markup to rasterize — export a blank white PNG rather than erroring,
  // matching how SVG/native export already don't block on it either.
  if (svgMarkup) {
    const svgUrl = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }));
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to rasterize SVG for PNG export'));
        img.src = svgUrl;
      });
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
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

// Shared by exportView (download) and copyViewToClipboard below — both need
// the same {blob, ext} for a given view/format, just handed to a different
// destination afterwards.
async function blobForExport(view, viewObj, format, theme) {
  if (format === 'native') {
    const { ext, mime } = NATIVE_FORMATS[view];
    return { blob: new Blob([viewObj.content], { type: mime }), ext };
  }
  if (format === 'png') {
    const svgMarkup = await svgMarkupFor(view, viewObj.content, theme);
    return { blob: await svgMarkupToPngBlob(svgMarkup), ext: 'png' };
  }
  const svgMarkup = await svgMarkupFor(view, viewObj.content, theme);
  return { blob: new Blob([svgMarkup], { type: 'image/svg+xml' }), ext: 'svg' };
}

export async function exportView(issue, view, format, theme) {
  const viewObj = issue.views[view];
  const safeIssueName = issue.name.trim().replace(/[^a-z0-9-_]+/gi, '-') || 'issue';
  const { blob, ext } = await blobForExport(view, viewObj, format, theme);
  triggerDownload(blob, `${safeIssueName}-${view}.${ext}`);
}

// PNG copies as an actual image (paste into Slack/docs/etc.); native and SVG
// copy as text (paste into a text editor) — SVG markup isn't a clipboard
// image type browsers reliably support pasting as a picture, so text is the
// more useful destination for it here.
export async function copyViewToClipboard(issue, view, format, theme) {
  const viewObj = issue.views[view];
  const { blob } = await blobForExport(view, viewObj, format, theme);
  if (format === 'png') {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  } else {
    await navigator.clipboard.writeText(await blob.text());
  }
}
