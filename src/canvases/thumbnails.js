import { renderProcessThumbnail } from './process/process-canvas.js';
import { renderDrawioThumbnail } from './system/drawio-canvas.js';
import { renderObjectThumbnail } from './object/object-canvas.js';

// ADR-0012: content-hash cache, not live updates — a repeat visit to the
// All view with unchanged content reuses the cached result instead of
// re-rendering (meaningfully avoids redundant draw.io iframe round-trips).
// Does not react to edits happening in another view while All isn't open;
// that's a separate, deferred feature.
const cache = new Map(); // `${issueId}:${view}` -> { content, result }

async function renderCached(issueId, view, content, renderFn) {
  const key = `${issueId}:${view}`;
  const cached = cache.get(key);
  if (cached && cached.content === content) return cached.result;

  const result = await renderFn();
  cache.set(key, { content, result });
  return result;
}

export async function renderAllThumbnails(issue, theme) {
  const [process, system, interaction, object] = await Promise.all([
    renderCached(issue.id, 'process', issue.views.process.content, () =>
      renderProcessThumbnail(issue.views.process.content)
    ),
    renderCached(issue.id, 'system', issue.views.system.content, () =>
      renderDrawioThumbnail(issue.views.system.content, theme)
    ),
    renderCached(issue.id, 'interaction', issue.views.interaction.content, () =>
      renderDrawioThumbnail(issue.views.interaction.content, theme)
    ),
    renderCached(issue.id, 'object', issue.views.object.content, () =>
      renderObjectThumbnail(issue.views.object.content, theme)
    ),
  ]);

  return { process, system, interaction, object };
}
