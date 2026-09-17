// Shared by both System/Integration and Interaction canvases (ADR-0005 —
// "one integration covers two canvases"). Hand-rolled against draw.io's
// documented embed postMessage protocol (no maintained vanilla-JS wrapper
// exists on npm worth depending on): the iframe sends {event:'init'} once
// ready, we reply with a 'load' action carrying the XML, and it sends
// {event:'autosave', xml} on every subsequent change.

const DRAWIO_ORIGIN = 'https://embed.diagrams.net';

// A genuinely empty XML string ('') makes draw.io's embed show its own
// "choose a template" gallery instead of landing on an editable blank
// canvas. A minimal, valid, empty mxGraphModel document opens directly
// into the normal editor, matching the starter-content fallback pattern
// already used by Process/Object for a brand-new (never-drawn-on) view.
const EMPTY_DRAWIO_XML =
  '<mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0"><root><mxCell id="0" /><mxCell id="1" parent="0" /></root></mxGraphModel>';

// Pins draw.io's own UI skin to its default light theme ('kennedy') via the
// iframe URL itself, not just the per-load `dark` flag: with no `ui` param,
// the embed can pick its skin from the OS/browser's prefers-color-scheme
// independently of `dark`, and unstyled diagram elements (e.g. an edge with
// no explicit strokeColor) default to whatever that skin implies — which is
// how a connector can render invisibly light even while the canvas
// background itself is correctly light (ADR-0024).
const IFRAME_SRC = `${DRAWIO_ORIGIN}/?embed=1&proto=json&spin=1&ui=kennedy`;

export function mountDrawioCanvas(container, viewObj, onChange, theme) {
  const iframe = document.createElement('iframe');
  iframe.src = IFRAME_SRC;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  container.appendChild(iframe);

  function handleMessage(event) {
    if (event.origin !== DRAWIO_ORIGIN || event.source !== iframe.contentWindow) return;

    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      return; // not a JSON message from draw.io — ignore
    }

    if (message.event === 'init') {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          action: 'load',
          xml: viewObj.content || EMPTY_DRAWIO_XML,
          autosave: 1,
          // The drawing surface stays permanently light regardless of shell
          // theme (ADR-0024) — connector strokes are baked into saved XML
          // as black by default and don't repaint when draw.io's chrome
          // goes dark, so a dark canvas would make them nearly invisible.
          dark: false,
        }),
        DRAWIO_ORIGIN
      );
    } else if (message.event === 'autosave' || message.event === 'save') {
      if (typeof message.xml === 'string') onChange(message.xml);
    }
  }

  window.addEventListener('message', handleMessage);

  return {
    destroy() {
      window.removeEventListener('message', handleMessage);
      iframe.remove();
    },
  };
}

// draw.io's SVG export bakes `color-scheme: light dark` onto the root <svg>,
// plus CSS `light-dark(...)` custom properties for things like the adaptive
// background — both resolve against the *viewing browser's* OS-level dark-
// mode preference, completely independent of Canvallax's own theme toggle
// and of the `dark: false` load-payload flag above. A viewer whose OS
// prefers dark gets unstyled connectors (default black) auto-inverted to
// white by the browser, invisible against a light tile regardless of what
// Canvallax's theme is doing. Forcing `color-scheme: light` here pins the
// export's own colors so they no longer depend on whoever happens to be
// looking at it.
function forceLightColorScheme(svgMarkup) {
  return svgMarkup.replace(/color-scheme:\s*light dark/, 'color-scheme: light');
}

// Decodes draw.io's data: URI into raw markup, matching bpmn-js/Mermaid's
// thumbnail functions — callers (thumbnails.js, export.js) can treat all
// four engines uniformly instead of the System tile alone needing an <img>.
function decodeSvgDataUri(dataUri) {
  const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
  return decodeURIComponent(escape(atob(base64)));
}

// ADR-0012: one-shot SVG export for the All view, via a temporary hidden
// iframe. Confirmed sequence (drawio.com embed-mode FAQ): init -> we send
// load -> editor acks with its own 'load' event once actually rendered
// (the real sync point, not just fire-and-forget) -> we send export -> it
// responds with a ready-to-use data: URI, decoded and re-colorscheme'd below.
export function renderDrawioThumbnail(xml, theme) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '300px';
    iframe.style.height = '200px';
    iframe.style.border = 'none';
    iframe.src = IFRAME_SRC;
    document.body.appendChild(iframe);

    function cleanup() {
      window.removeEventListener('message', handleMessage);
      iframe.remove();
    }

    function handleMessage(event) {
      if (event.origin !== DRAWIO_ORIGIN || event.source !== iframe.contentWindow) return;

      let message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        return;
      }

      if (message.event === 'init') {
        iframe.contentWindow.postMessage(
          // dark: false — see the matching comment in mountDrawioCanvas (ADR-0024).
          JSON.stringify({ action: 'load', xml: xml || EMPTY_DRAWIO_XML, dark: false }),
          DRAWIO_ORIGIN
        );
      } else if (message.event === 'load') {
        iframe.contentWindow.postMessage(JSON.stringify({ action: 'export', format: 'svg' }), DRAWIO_ORIGIN);
      } else if (message.event === 'export') {
        cleanup();
        resolve(forceLightColorScheme(decodeSvgDataUri(message.data)));
      }
    }

    window.addEventListener('message', handleMessage);
  });
}
