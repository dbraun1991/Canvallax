// Pan/zoom for Presenting mode's featured display (ADR-0036). Hand-rolled
// CSS-transform pan/zoom over the thumbnail's existing SVG markup — no live
// engine mounts (ADR-0019), and vector SVG stays crisp at any scale.
// Registered as Alpine.data('panZoom') in main.js; used via x-data on the
// featured display's thumbnail container.
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const BUTTON_STEP = 1.4;
const DRAG_THRESHOLD_PX = 4;

export function panZoom() {
  return {
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    _drag: null,

    get layerStyle() {
      return { transform: `translate(${this.x}px, ${this.y}px) scale(${this.scale})` };
    },

    reset() {
      this.scale = 1;
      this.x = 0;
      this.y = 0;
    },

    // Zooms about a point (container-relative px) so that point stays put
    // under the cursor. At MIN_SCALE the diagram is exactly "fit", so
    // panning is meaningless there and the offset snaps back to 0.
    zoomAt(factor, cx, cy) {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * factor));
      if (next === this.scale) return;
      const ratio = next / this.scale;
      this.x = cx - (cx - this.x) * ratio;
      this.y = cy - (cy - this.y) * ratio;
      this.scale = next;
      if (this.scale === MIN_SCALE) {
        this.x = 0;
        this.y = 0;
      }
    },

    zoomButton(direction, container) {
      const rect = container.getBoundingClientRect();
      this.zoomAt(direction > 0 ? BUTTON_STEP : 1 / BUTTON_STEP, rect.width / 2, rect.height / 2);
    },

    onWheel(event, container) {
      const rect = container.getBoundingClientRect();
      this.zoomAt(Math.exp(-event.deltaY * 0.002), event.clientX - rect.left, event.clientY - rect.top);
    },

    onPointerDown(event, container) {
      if (event.button !== 0 || this.scale === MIN_SCALE) return;
      container.setPointerCapture(event.pointerId);
      this._drag = { px: event.clientX, py: event.clientY, x: this.x, y: this.y };
      this.dragging = true;
    },

    onPointerMove(event) {
      if (!this._drag) return;
      this.x = this._drag.x + (event.clientX - this._drag.px);
      this.y = this._drag.y + (event.clientY - this._drag.py);
    },

    onPointerUp(event, container) {
      if (!this._drag) return;
      const moved = Math.hypot(event.clientX - this._drag.px, event.clientY - this._drag.py) > DRAG_THRESHOLD_PX;
      this._drag = null;
      this.dragging = false;
      if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
      return moved;
    },
  };
}
