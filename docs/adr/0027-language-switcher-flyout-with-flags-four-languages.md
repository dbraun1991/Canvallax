# ADR-0027: Language switcher is a right-opening flyout with flags; four languages, not two

- Status: Accepted
- Date: 2026-09-17
- Relates to: [ADR-0026](0026-multi-language-shell-ui-i18next.md) — supersedes, partially, its switcher-UI mechanism and its initial two-language set

## Context

[ADR-0026](0026-multi-language-shell-ui-i18next.md) built the language switcher as a `<select>` embedded directly in the burger menu, shipping with English and German, specifically to avoid the "per-language buttons → `<select>`" migration Climb-Buddy-Belay had to do once it outgrew two languages.

Direct feedback after that ADR was implemented changed both specifics before the feature shipped further:

- The burger menu's rows should be visually consistent — the theme toggle already carries an icon pair, but "Change Issue" and the language row didn't, and the requested fix was an icon on "Change Issue" plus reordering the menu so Language sits right before Settings (now last).
- The language switcher itself should open as a flyout to the right, not sit as an inline `<select>` — and should represent each language with a flag, the way Climb-Buddy-Belay's own switcher does (`🇩🇪 DE`, `🇬🇧 EN`, `🇫🇷 FR`, `🇪🇸 ES` as flag-emoji-prefixed `<option>` text in one native `<select>`, per its own `docs/adr/0009-inline-vanilla-i18n-en-de.md`).
- French and Spanish should ship now, not later — the same four-language set Climb-Buddy-Belay eventually settled on, added directly rather than starting at two and expanding again.

No other project in this workspace combines flags with a side-opening flyout — that specific interaction is new UI, not a precedent being copied wholesale; the closest structural relative is Metroviz's click-toggled Export submenu (`x-data`/`@click.away`), which opens downward, not sideways.

## Decision

1. **Switcher mechanism**: the Language row in the burger menu is a `.burger-menu-item` button, not an inline `<select>`. Clicking it toggles a flyout panel (`.language-flyout`) anchored to its right edge (`position: absolute; left: 100%`), styled like the burger menu itself (same surface/border/shadow), listing every supported language as its own clickable row. Selecting a language closes both the flyout and the burger menu.
2. **Flags**: each language row shows its flag — a plain Unicode emoji, no image/SVG asset, matching Climb-Buddy-Belay's convention exactly — next to its endonym name (`English`, `Deutsch`, `Français`, `Español`, never run through `t()`, same reasoning ADR-0026 already applied to language names). The parent Language row itself shows the *currently active* language's flag as its icon, mirroring how the theme toggle shows the icon for the current theme, not the destination.
3. **Four languages ship together**: `en`, `de`, `fr`, `es` (`src/locales/fr/translation.json`, `src/locales/es/translation.json` added alongside the existing `en`/`de`). English stays the first-visit default (ADR-0026, ADR-0020's reasoning still applies).
4. **Change Issue gets an icon** (a swap/exchange glyph) so every row with a natural icon has one; Settings remains text-only — there's no obvious glyph for a placeholder overlay.
5. **Menu order**: Change Issue, theme toggle, Language, Settings — Settings moves to last.

Implementation note: the flyout is a DOM child of `.burger-menu`, which previously had `overflow: hidden` (to keep hover backgrounds within its rounded corners). Since the flyout is positioned outside that box (`left: 100%`), `overflow: hidden` would clip it — removed, with corner-rounding reapplied directly to the first/last `.burger-menu-item` instead.

## Consequences

**Positive**

- A flag reads faster than a two-letter code guess, especially for someone who doesn't already know `de`/`fr`/`es` as ISO codes.
- The flyout's per-row layout has headroom for more detail later (e.g. an inline "beta" note on an incomplete translation) without a redesign, unlike a native `<select>`.
- The burger menu reads consistently now — every row either carries an icon (Change Issue, theme toggle, Language via its current flag) or has a clear reason not to (Settings).

**Negative / risks**

- A custom flyout is more markup/CSS than a native `<select>` and loses the `<select>`'s built-in keyboard/accessibility handling. Revisit with explicit ARIA roles (`role="menu"`/`menuitem`) if that turns out to matter in practice.
- Flag-emoji rendering quality depends on the OS/browser's emoji font — the same caveat Climb-Buddy-Belay already accepted for its own switcher.

## Alternatives considered

- **Keep ADR-0026's `<select>`, just extend its options to four flag-prefixed entries** (Climb-Buddy-Belay's literal approach). Rejected per explicit direction: the menu should open a flyout, not stay a dropdown `<select>`.
- **A submenu opening downward/below the Language row**, matching Metroviz's only existing flyout precedent (its Export dropdown). Rejected per explicit direction that it open to the right.
