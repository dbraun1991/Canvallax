import {
  loadAllIssues,
  scheduleSave,
  createIssue,
  restoreView,
  addBacklogEntry,
  deleteBacklogEntry,
  copyView,
  copyBacklogEntry,
} from '../persistence/issue-store.js';
import { getViewHistory } from '../persistence/git-store.js';
import { mountProcessCanvas } from '../canvases/process/process-canvas.js';
import { mountDrawioCanvas } from '../canvases/system/drawio-canvas.js';
import { mountObjectCanvas } from '../canvases/object/object-canvas.js';
import { mountExcalidrawCanvas } from '../canvases/interaction/excalidraw-canvas.js';
import { renderAllThumbnails as renderThumbnails } from '../canvases/thumbnails.js';
import { exportView, exportIssueZip, copyViewToClipboard, NATIVE_FORMATS } from '../canvases/export.js';

// Process needs two child containers (canvas + properties panel); the
// other engines mount straight into the single wrapper element. Adapting
// here keeps _syncCanvas's mountFn contract uniform: (wrapperEl, viewObj,
// onChange) => { destroy() }.
function mountProcessCanvasAdapter(wrapperEl, viewObj, onChange) {
  const canvasEl = wrapperEl.querySelector('.process-canvas-container');
  const propertiesEl = wrapperEl.querySelector('.process-properties-panel');
  return mountProcessCanvas(canvasEl, propertiesEl, viewObj, onChange);
}

const VIEWS = ['all', 'process', 'system', 'object', 'interaction'];

const VIEW_INSTANCE_KEYS = {
  process: '_processInstance',
  system: '_systemInstance',
  interaction: '_interactionInstance',
  object: '_objectInstance',
};

// Alpine data factory for the Issue-shell (ADR-0017/0018). Key
// state-transition rules:
//   - selectIssue: always resets view -> 'all', expands the Backlog panel,
//     and closes the Issue-picker overlay, regardless of what was left over
//     from a previously active Issue.
//   - setView: changes only the active view; the Backlog panel's expanded
//     flag is untouched, so it doesn't flicker when switching canvases.
//   - showIssuePicker: forced open whenever !activeIssue (no dismiss control
//     in that state), OR'd with the manual issuePickerOpen flag from the
//     burger menu — two reasons to be open, not one flag doing double duty.
//   - setCanvasMode: switching into 'presenting' always drops back to the
//     All-grid and clears any open zoom; switching into 'editing' leaves
//     activeView wherever it already was. canvasMode itself is NOT reset by
//     selectIssue — a standing session preference, not per-Issue state.
//   - startBacklogResize: dragging the handle past a threshold
//     collapses/expands the panel live (see its own comment below) —
//     backlogExpanded still exists and still resets to true on selectIssue.
export function shellState() {
  return {
    issues: [],
    loading: true,
    activeIssueId: null,
    activeView: 'all',
    backlogExpanded: true,
    backlogWidth: 320,
    resizingBacklog: false, // drives the handle's active-drag affordance (ADR-0017: only one resizable panel left)
    issuePickerQuery: '',
    issuePickerOpen: false, // manual open via the burger menu; showIssuePicker (below) ORs this with !activeIssue
    burgerMenuOpen: false,
    languageMenuOpen: false, // ADR-0026: language flyout nested inside the burger menu, opens to the right
    settingsOpen: false, // ADR-0017: mock overlay, no real settings surface yet
    howToOpen: false,
    howToView: null, // null (general How To) | 'process' | 'system' | 'object' | 'interaction' (ADR-0035)
    canvasMode: 'editing', // 'editing' | 'presenting' (ADR-0018) — a standing session preference, not reset per-Issue
    featuredCanvas: null, // null | 'process' | 'system' | 'object' | 'interaction' — Presenting mode's enlarged tile (ADR-0019)
    _processInstance: null,
    _systemInstance: null,
    _interactionInstance: null,
    _objectInstance: null,
    thumbnails: { process: null, system: null, interaction: null, object: null },
    historyOpen: false,
    historyEntries: [],
    copyPickerOpen: false,
    copyPickerMode: null, // 'view' | 'entry'
    copySourceId: '',
    copySourceEntryId: '',
    newEntryName: '',
    exportPickerOpen: false,
    exportTarget: null, // which canvas the open picker exports — the tab's own, or an All-grid tile's (Phase 3)
    exportFormat: 'native', // 'native' | 'svg'
    exportNativeFormats: NATIVE_FORMATS, // exposed for the picker's native-format label
    // Mirrors the data-theme attribute the inline head script already set
    // (ADR-0013) — never re-derived independently, so this can't disagree
    // with what's actually rendered.
    theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',

    // Alpine's special lifecycle method — called automatically once this
    // component initializes. Issue loading is async (real git/IndexedDB
    // access, ADR-0010), so `issues` can't be populated synchronously the
    // way the mock array was.
    async init() {
      this.issues = await loadAllIssues();
      this.loading = false;
    },

    get activeIssue() {
      return this.issues.find((issue) => issue.id === this.activeIssueId) ?? null;
    },

    // ADR-0017: forced open whenever nothing's selected (no dismiss control in
    // that state, same as the old sidebar-driven placeholder it replaces) OR'd
    // with the manual flag from the burger menu's "Change Issue" — two
    // separate reasons to be open, not one flag doing double duty.
    get showIssuePicker() {
      return this.issuePickerOpen || !this.activeIssue;
    },

    get filteredIssues() {
      const query = this.issuePickerQuery.trim().toLowerCase();
      if (!query) return this.issues;
      return this.issues.filter((issue) => issue.name.toLowerCase().includes(query));
    },

    // Other Issues to pick as a copy source — never the active one (ADR-0011:
    // a whole Issue is never copyable, and copying "from itself" is a no-op).
    get copySourceOptions() {
      return this.issues.filter((issue) => issue.id !== this.activeIssueId);
    },

    get copySourceEntries() {
      const source = this.issues.find((issue) => issue.id === this.copySourceId);
      return source ? source.backlogEntries : [];
    },

    // ADR-0015: computed live from copiedFrom + the current `issues` array,
    // never stored — a renamed source Issue is reflected immediately rather
    // than showing a name frozen at copy time. Bound as a :title tooltip on
    // both a view's and a Backlog entry's copy-provenance text, which stays
    // a short fixed label; this is what answers "from which Issue, when".
    copyProvenanceLabel(copiedFrom) {
      if (!copiedFrom) return '';
      const source = this.issues.find((issue) => issue.id === copiedFrom.issueId);
      const sourceName = source ? source.name : this.t('copyPicker.deletedIssue');
      return this.t('copyPicker.provenanceLabel', {
        name: sourceName,
        date: new Date(copiedFrom.at).toLocaleString(),
      });
    },

    // ADR-0023: a reminder of *why this view exists for this Issue at all* —
    // its specific purpose, and that what it shows is the current proposal,
    // open to change, not a usage tip. Editing-mode only (index.html); shown
    // above each of the four single-canvas views. Text lives in
    // src/locales/<lang>/translation.json (ADR-0026), not inline here.
    canvasHint(view) {
      return this.t(`canvasHints.${view}`);
    },

    // Shorthand for $store.i18n.t (ADR-0026) — kept as a shell method rather
    // than requiring every template binding to spell out $store.i18n.t(...),
    // matching how every other piece of dynamic shell text is already a
    // method call (e.g. canvasHint above) rather than an inline expression.
    t(key, options) {
      return this.$store.i18n.t(key, options);
    },

    selectIssue(id) {
      this.activeIssueId = id;
      this.activeView = 'all';
      this.backlogExpanded = true;
      this.issuePickerOpen = false;
    },

    async createNewIssue() {
      const issue = await createIssue();
      this.issues.push(issue);
      this.selectIssue(issue.id);
    },

    setView(view) {
      if (!VIEWS.includes(view)) return;
      this.activeView = view;
    },

    // ADR-0017. openIssuePicker also works while an Issue is already active
    // (burger menu's "Change Issue"); closeIssuePicker is a no-op in effect
    // when !activeIssue, since showIssuePicker's other half keeps it open.
    openIssuePicker() {
      this.issuePickerOpen = true;
      this.burgerMenuOpen = false;
    },

    closeIssuePicker() {
      this.issuePickerOpen = false;
    },

    toggleBurgerMenu() {
      this.burgerMenuOpen = !this.burgerMenuOpen;
      this.languageMenuOpen = false;
    },

    closeBurgerMenu() {
      this.burgerMenuOpen = false;
      this.languageMenuOpen = false;
    },

    // ADR-0027: opens/closes on hover, not click — bound to mouseenter/
    // mouseleave on the row+flyout's wrapping element (index.html) so
    // leaving either the row or the flyout itself (not just the row) closes
    // it, letting the pointer travel from one to the other without the
    // flyout disappearing mid-move.
    openLanguageMenu() {
      this.languageMenuOpen = true;
    },

    closeLanguageMenu() {
      this.languageMenuOpen = false;
    },

    selectLanguage(lang) {
      this.$store.i18n.changeLanguage(lang);
      this.closeBurgerMenu();
    },

    openSettings() {
      this.settingsOpen = true;
      this.burgerMenuOpen = false;
    },

    closeSettings() {
      this.settingsOpen = false;
    },

    // ADR-0035: one overlay, two entry points — the burger menu's "How To"
    // opens it with view === null (general concepts); the per-canvas button
    // in .view-tabs-actions opens it with the current activeView (that
    // canvas's own editing basics). Which content renders is decided in
    // index.html by howToView, not by two separate overlays.
    openHowTo(view = null) {
      this.howToView = view;
      this.howToOpen = true;
      this.burgerMenuOpen = false;
    },

    closeHowTo() {
      this.howToOpen = false;
    },

    // Each canvas's basics are a short list, not one string — i18next's
    // returnObjects option resolves the array the same as any other key.
    howToCanvasSteps() {
      if (!this.howToView) return [];
      return this.t(`howTo.canvas.${this.howToView}.steps`, { returnObjects: true });
    },

    // One official, first-party doc link per underlying tool (ADR-0035) —
    // fixed, not translated: each is the tool's own docs, not Canvallax's.
    howToCanvasLink() {
      const links = {
        process: 'https://bpmn.io/toolkit/bpmn-js/walkthrough/',
        system: 'https://www.drawio.com/docs/',
        object: 'https://mermaid.js.org/syntax/entityRelationshipDiagram.html',
        interaction: 'https://excalidraw.com/',
      };
      return links[this.howToView] ?? '';
    },

    // ADR-0018. Switching into Presenting always drops back to the grid and
    // clears any featured tile, since Presenting has no "entered a canvas"
    // state at all; switching into Editing leaves activeView wherever it
    // already was — no forced navigation in that direction.
    setCanvasMode(mode) {
      this.canvasMode = mode;
      this.featuredCanvas = null; // start clean either way
      if (mode === 'presenting') {
        this.activeView = 'all';
      }
    },

    toggleCanvasMode() {
      this.setCanvasMode(this.canvasMode === 'editing' ? 'presenting' : 'editing');
    },

    // ADR-0019: Presenting mode's enlarge is an in-place reflow of the All
    // grid itself (allGridStyle, below), not a full-screen lightbox — the
    // Backlog panel and everything else in the shell stay interactive.
    // Clicking the already-featured tile un-features it (back to plain
    // 2x2); clicking a different tile switches the feature to it directly.
    toggleZoom(view) {
      this.featuredCanvas = this.featuredCanvas === view ? null : view;
    },

    // Drives .all-grid's grid-template-* via :style (index.html). Default:
    // a plain 2x2, each .all-cell in its own static grid-area (CSS, keyed
    // by data-view). Featured (ADR-0033): a wide "featured" grid-area
    // (a separate element, index.html's .all-featured-display — not one of
    // the four tiles resized) plus a narrow column with all four tiles
    // still in it, always in this same Process/System/Object/Interaction
    // order — none of the four ever move, get excluded, or reappear
    // elsewhere depending on which one is featured; the featured one just
    // dims in place (index.html's :class="{ dimmed: ... }").
    get allGridStyle() {
      // minmax(0, Nfr), not plain Nfr: an `fr` track's implicit minimum is
      // `auto` (its content's min-content size), so a diagram's own
      // intrinsic SVG dimensions can force a track wider than the
      // container regardless of the fr ratio — capping the minimum to 0
      // lets .all-cell's own overflow: hidden do the clipping instead.
      if (!this.featuredCanvas) {
        return {
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
          gridTemplateAreas: '"process system" "object interaction"',
        };
      }
      // 3fr : 1fr keeps the narrow column's width fraction (1/4 of the
      // total width) matching its four equal rows' height fraction (1/4 of
      // the total height each) — the same width:height fraction pairing
      // the old 3-row layout had (1/3 : 1/3), so each mini tile keeps
      // roughly the same shape rather than going squatter now that a
      // fourth row is always present.
      return {
        gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)',
        gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
        gridTemplateAreas: '"featured process" "featured system" "featured object" "featured interaction"',
      };
    },

    // Label for the featured display (index.html's .all-featured-display) —
    // System is the one view whose short nav label ('System') differs from
    // its full All-view heading ('System/Integration'); the four small
    // tiles hardcode this per-cell already, this mirrors it for the one
    // dynamic instance.
    get featuredCanvasLabel() {
      if (!this.featuredCanvas) return '';
      return this.featuredCanvas === 'system' ? this.t('canvas.systemFull') : this.t(`canvas.${this.featuredCanvas}`);
    },

    // Bound to the Issue name/status controls (view-switcher tab bar,
    // ADR-0007) and to each Backlog entry's name/description fields.
    // activeIssue is a live reference into the reactive `issues` array, so
    // x-model has already mutated it in place by the time this runs — same
    // pattern the canvas onChange handlers use for views[view].content.
    saveActiveIssue() {
      if (!this.activeIssue) return;
      scheduleSave(this.activeIssue);
    },

    async addEntry() {
      const name = this.newEntryName.trim();
      if (!name || !this.activeIssue) return;
      await addBacklogEntry(this.activeIssue, name);
      this.newEntryName = '';
    },

    async deleteEntry(entryId) {
      if (!this.activeIssue) return;
      await deleteBacklogEntry(this.activeIssue, entryId);
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', this.theme);
      try {
        localStorage.setItem('canvallax_theme', this.theme);
      } catch (e) {
        // private browsing / storage disabled — theme just won't persist
      }
    },

    // Drag-handle resize (ADR-0016), now a single panel since ADR-0017
    // removed the Issue sidebar. The Backlog panel sits on the left now, so
    // it grows to the right — dragging past COLLAPSE_THRESHOLD collapses it
    // to the thin COLLAPSED_WIDTH rail (`.backlog-panel.collapsed` in
    // shell.css) instead of clamping at MIN_PANEL_WIDTH. The resize handle
    // stays visible on that rail (index.html doesn't hide it when
    // collapsed), so dragging it back out past the same threshold
    // re-expands the panel live, mid-drag — there's no separate "reopen"
    // control. resizingBacklog drives the handle's `.resizing` affordance
    // for the whole drag — the pointer leaves the 6px-wide handle strip
    // almost immediately once dragging starts, so a plain CSS :hover state
    // alone would flicker off mid-drag.
    startBacklogResize(event) {
      event.preventDefault();
      const startX = event.clientX;
      const MIN_PANEL_WIDTH = 200;
      const MAX_PANEL_WIDTH = 480;
      const COLLAPSE_THRESHOLD = 100;
      const COLLAPSED_WIDTH = 32; // matches .backlog-panel.collapsed in shell.css

      const startWidth = this.backlogExpanded ? this.backlogWidth : COLLAPSED_WIDTH;

      this.resizingBacklog = true;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none'; // dragging across text would otherwise select it

      const onMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const rawWidth = startWidth + delta;

        if (rawWidth < COLLAPSE_THRESHOLD) {
          this.backlogExpanded = false;
        } else {
          this.backlogExpanded = true;
          this.backlogWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, rawWidth));
        }
      };
      const onUp = () => {
        this.resizingBacklog = false;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },

    // Bound via x-effect on each single-canvas view's container, re-evaluated
    // on every activeView/activeIssueId change. No-ops unless the desired
    // mounted issue actually changed for THIS view, so repeated
    // re-evaluations (Alpine re-runs x-effect on any reactive read inside
    // it) don't remount, and switching directly between two views that
    // share an engine module (System <-> Interaction) can't let one
    // instance's mount clobber the other's — each tracks its own handle,
    // not module-level state.
    _syncCanvas(view, wrapperEl, mountFn, instanceKey) {
      const shouldMount = this.activeView === view && this.activeIssue;
      const key = shouldMount ? this.activeIssue.id : null;
      const mountedKey = this[instanceKey] ? this[instanceKey].issueId : null;
      if (key === mountedKey) return;

      if (this[instanceKey]) {
        this[instanceKey].destroy();
        this[instanceKey] = null;
      }
      if (shouldMount) {
        const handle = mountFn(
          wrapperEl,
          this.activeIssue.views[view],
          (content) => {
            this.activeIssue.views[view].content = content;
            scheduleSave(this.activeIssue);
          },
          this.theme
        );
        this[instanceKey] = { issueId: key, destroy: handle.destroy };
      }
    },

    syncProcessCanvas(el) {
      this._syncCanvas('process', el, mountProcessCanvasAdapter, '_processInstance');
    },

    syncSystemCanvas(el) {
      this._syncCanvas('system', el, mountDrawioCanvas, '_systemInstance');
    },

    syncInteractionCanvas(el) {
      this._syncCanvas('interaction', el, mountExcalidrawCanvas, '_interactionInstance');
    },

    syncObjectCanvas(el) {
      this._syncCanvas('object', el, mountObjectCanvas, '_objectInstance');
    },

    // Bound via x-effect on the All view's wrapping element (ADR-0012).
    // Reruns whenever activeIssueId changes while activeView === 'all' —
    // no destroy/handle needed here, unlike the four single-canvas syncs
    // above, since rendering a thumbnail is a one-shot async call, not a
    // persistent mounted instance. thumbnails.js's own content-hash cache
    // handles avoiding redundant re-renders.
    async renderAllThumbnails() {
      if (!this.activeIssue) return;
      const issue = this.activeIssue;
      this.thumbnails = { process: null, system: null, interaction: null, object: null };
      this.thumbnails = await renderThumbnails(issue, this.theme);
    },

    // ADR-0010's history-browsing feature. Only meaningful for a single-
    // canvas view, not All — index.html hides the History button there.
    async toggleHistory() {
      this.historyOpen = !this.historyOpen;
      if (this.historyOpen && this.activeIssue) {
        this.historyEntries = await getViewHistory(this.activeIssue.id, this.activeView);
      }
    },

    // Shared by both History-restore and Copy(view) below — _syncCanvas only
    // remounts on activeIssueId change, never on content changing while
    // already mounted. Clearing the tracked instance nudges it: that field
    // is itself a reactive property _syncCanvas reads, so clearing it
    // triggers the bound x-effect to remount fresh with the new content.
    _forceRemount(view) {
      const instanceKey = VIEW_INSTANCE_KEYS[view];
      if (instanceKey && this[instanceKey]) {
        this[instanceKey].destroy();
        this[instanceKey] = null;
      }
    },

    async restoreHistoryEntry(oid) {
      if (!this.activeIssue) return;
      await restoreView(this.activeIssue, this.activeView, oid);
      this._forceRemount(this.activeView);
      this.historyOpen = false;
    },

    // ADR-0011. mode: 'view' copies into the currently active single-canvas
    // view (overwrite); 'entry' appends a copy of a chosen source Issue's
    // Backlog entry to the active Issue's own list.
    openCopyPicker(mode) {
      this.copyPickerMode = mode;
      this.copySourceId = '';
      this.copySourceEntryId = '';
      this.copyPickerOpen = true;
    },

    closeCopyPicker() {
      this.copyPickerOpen = false;
    },

    async performCopy() {
      if (!this.activeIssue || !this.copySourceId) return;
      const source = this.issues.find((issue) => issue.id === this.copySourceId);
      if (!source) return;

      if (this.copyPickerMode === 'view') {
        await copyView(source, this.activeView, this.activeIssue);
        this._forceRemount(this.activeView);
      } else if (this.copyPickerMode === 'entry' && this.copySourceEntryId) {
        await copyBacklogEntry(source, this.copySourceEntryId, this.activeIssue);
      }

      this.copyPickerOpen = false;
    },

    // Canvas/diagram export (agents.md Future Work): one view at a time —
    // native source, SVG, PNG or PDF; copy (all but PDF) or download. The
    // target is the active canvas tab's, or, from an All-grid tile's own
    // export button (Phase 3), that tile's canvas.
    openExportPicker(view = this.activeView) {
      if (view === 'all') return;
      this.exportTarget = view;
      this.exportFormat = 'native';
      this.exportPickerOpen = true;
    },

    closeExportPicker() {
      this.exportPickerOpen = false;
    },

    async performExportCopy() {
      if (!this.activeIssue || !this.exportTarget || this.exportFormat === 'pdf') return;
      await copyViewToClipboard(this.activeIssue, this.exportTarget, this.exportFormat, this.theme);
      this.exportPickerOpen = false;
    },

    async performExport() {
      if (!this.activeIssue || !this.exportTarget) return;
      await exportView(this.activeIssue, this.exportTarget, this.exportFormat, this.theme);
      this.exportPickerOpen = false;
    },

    // Issue-level bulk export (Phase 3): every canvas as SVG + PNG in one ZIP.
    async performIssueExport() {
      this.closeBurgerMenu();
      if (!this.activeIssue) return;
      await exportIssueZip(this.activeIssue, this.theme);
    },
  };
}
