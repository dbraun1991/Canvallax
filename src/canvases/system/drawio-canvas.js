// Shared by both System/Integration and Interaction canvases (ADR-0005 —
// "one integration covers two canvases"). Hand-rolled against draw.io's
// documented embed postMessage protocol (no maintained vanilla-JS wrapper
// exists on npm worth depending on): the iframe sends {event:'init'} once
// ready, we reply with a 'load' action carrying the XML, and it sends
// {event:'autosave', xml} on every subsequent change.

const DRAWIO_ORIGIN = 'https://embed.diagrams.net';

export function mountDrawioCanvas(container, viewObj, onChange, theme) {
  const iframe = document.createElement('iframe');
  iframe.src = `${DRAWIO_ORIGIN}/?embed=1&proto=json&spin=1`;
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
          xml: viewObj.content || '',
          autosave: 1,
          dark: theme === 'dark',
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

// ADR-0012: one-shot SVG export for the All view, via a temporary hidden
// iframe. Confirmed sequence (drawio.com embed-mode FAQ): init -> we send
// load -> editor acks with its own 'load' event once actually rendered
// (the real sync point, not just fire-and-forget) -> we send export -> it
// responds with a ready-to-use data: URI (not raw SVG markup, unlike
// bpmn-js/Mermaid's thumbnails).
export function renderDrawioThumbnail(xml, theme) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '300px';
    iframe.style.height = '200px';
    iframe.style.border = 'none';
    iframe.src = `${DRAWIO_ORIGIN}/?embed=1&proto=json&spin=1`;
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
          JSON.stringify({ action: 'load', xml: xml || '', dark: theme === 'dark' }),
          DRAWIO_ORIGIN
        );
      } else if (message.event === 'load') {
        iframe.contentWindow.postMessage(JSON.stringify({ action: 'export', format: 'svg' }), DRAWIO_ORIGIN);
      } else if (message.event === 'export') {
        cleanup();
        resolve(message.data);
      }
    }

    window.addEventListener('message', handleMessage);
  });
}
