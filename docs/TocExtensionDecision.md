# TOC extension: fork or public API?

Rationale for the team discussion: how the transparency slider in the TOC should be implemented, what led me (Claude,
who did the implementation) to each solution, and where I was wrong.
How this fits into the other decisions: [DashboardDecisions.md](./DashboardDecisions.md), section 9.

> **Status:** Decided for `toc-native` (public API, no fork), merged into `main`. `dashboard` with the fork
> remains only as a reference.

## Summary

Below every WMS layer in the TOC there should be a transparency slider. `@open-pioneer/toc` offers no intended
place for this. There are two working variants: a fork of the TOC (branch `dashboard`) and an extension of the
unmodified TOC via its public API (branch `toc-native`). I recommend `toc-native` because it works without our own
copy of the TOC. Its risks are known and do not affect today's configuration. The decision lies
with the team.

## Starting point

- Goal: a slider directly below the name of every WMS layer, so that the transparency can be set without a detour.
- For content per layer, `@open-pioneer/toc` 1.5.0 has:
    - **no prop** (`showTools`, `collapsibleGroups`, `onReady` … none of them fit),
    - **no children** (`Toc` does not accept any),
    - **no exported subcomponents**: `LayerList`, `LayerItem`, `LayerItemMenu` and the internal context are
      not exported, the `package.json` only exposes `"."`. Even a Vite alias could not swap anything,
      because `Toc` always renders `LayerList` and that always renders `LayerItem`.
- React function components have no inheritance. They can only be extended from outside via props, children,
  context or references to the rendered elements.

## Why I forked first

- I checked props, children and exported subcomponents and found nothing.
- I had only thought of hooking content into the finished DOM as "find entries via CSS classes and fill them via a
  portal". I rejected that as fragile: one would have had to watch for oneself when the TOC re-renders entries
  (`MutationObserver`), and would have depended on internal classes.
- **I overlooked the imperative API**: `onReady` provides a `TocApi` whose entries (`TocItem`) expose their
  DOM element as `htmlElement`. I did not recognize it as an extension point because the TOC docs describe it
  for scrolling and expanding/collapsing.
- The fork promised a clean, typed prop and a safe placement of the slider in the entry. That is why I
  implemented it: `src/packages/toc` as `@cosite/toc`, taken from the upstream tag `@open-pioneer/toc@1.5.0`
  (commit `cb6feb5`).
- History on the fork: as requested, first as an interface in the ⋮ menu (`58c94ff`). There the slider was overlooked,
  so it was moved directly below the layer name (`5c52ad7`).

## What triggered the reassessment

- The requirement "no fork, no patch, no pull request" and the question of why the existing component cannot be
  extended.
- The cost-benefit ratio of the fork: **23 copied files for 55 changed lines in 4 files**. With every
  update of `@open-pioneer/toc`, the new version has to be taken over and the change re-applied by hand.
  Your own docs ([WaysToPatchAPackage.md](./WaysToPatchAPackage.md)) advise choosing the "less powerful" means in
  each case.
- On rereading the TOC source code it became clear: `TocItem.htmlElement` is not only public but also
  **reactive**. This removes exactly what I had considered fragile about the DOM approach.

## Why the API solution holds up

Implementation: `src/apps/dashboard/toc/TocItemExtensions.tsx` (76 lines), commits `22b279a` and `9dc52cb` on
`toc-native`.

- **Public, documented interface:** `onReady` → `TocApi.getItems()` → `TocItem.htmlElement`. No access to
  internal modules, no lookup via classes.
- **Reactive:** `htmlElement` is a `reactive()`, the entries are kept in a `reactiveMap`. If the TOC re-renders an
  entry or removes it, this is reported, and the slider attaches itself to the new element. A
  `MutationObserver` is not needed.
- **Stays part of the app:** a custom `<div class="toc-layer-item-extra">` is appended as the last child of the
  entry (`<li class="toc-layer-item layer-<id>">`). The slider is rendered into it via React `createPortal` and thus
  has access to Chakra, translations and app state.
- **Upstream updates simply come along.** The TOC itself is unmodified.
- **Checked in the browser:** exactly one slider, aligned pixel-perfectly with the title, working after using the
  slider, toggling the group on/off, switching language, toggling the TOC panel on/off and toggling the layer off/on.
  No console errors.

## Risks of the API solution

| #   | Problem                                                                                                                                                                                                                          | Affected today?                                                                                     | Possible safeguard (not implemented)                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | **Position only at the end of the entry.** If an entry has visible children (group, WMS with several displayed layers), the slider is placed below the children instead of below the title.                                      | No: the DWD layer has only one, hidden sublayer. A WMS with several `wms.layers` would be affected. | Insert the container directly after the title row (`.toc-layer-item-content`)            |
| 2   | **Foreign element in the TOC markup.** React leaves unknown children alone, but appends new children of its own at the end, i.e. after our container.                                                                            | No                                                                                                  | as 1                                                                                     |
| 3   | **Markup not guaranteed.** According to the TOC README, only the class `layer-<id>` is guaranteed, not the inner structure. `htmlElement` is officially intended "e.g. for scrolling". An update can move the slider (no crash). | No: the version stays at 1.5.0 until someone deliberately updates (`resolutionMode: lowest-direct`) | On a version jump, check the slider in the browser; console warning if structure missing |
| 4   | **Indentation hard-coded.** Assumes `collapsibleGroups` and the current Chakra sizes.                                                                                                                                            | No                                                                                                  | Measure the indentation from the actual title position                                   |
| 5   | **No automated tests** for the position. Visible only in the browser.                                                                                                                                                            | –                                                                                                   | Browser test before TOC updates                                                          |
| 6   | **Re-rendering / re-mounting** of the TOC.                                                                                                                                                                                       | Checked, works. The slider value is tied to the opacity of the map layer and is preserved.          | –                                                                                        |
| 7   | **Interaction.** A click on the slider does not toggle the layer, no conflicts with keyboard interaction.                                                                                                                        | Checked, not critical                                                                               | –                                                                                        |
| 8   | **Shadow DOM.** Portal into the app's shadow root.                                                                                                                                                                               | Checked, works                                                                                      | –                                                                                        |

## When the fork would be better after all

- Content should go **in the middle** of an entry, e.g. in the title row next to the name or into the ⋮ menu.
- **Entries with visible children** (groups, WMS with several layers) should be extended as well.
- **Further, deeper customizations** of the TOC are planned. Then our own copy is more worthwhile.
- Upstream updates **repeatedly** shift the placement, so the API solution constantly has to be fixed.

## Criteria for the team decision

- **Maintenance effort versus control:** fork = full control, but reconciliation with every update. API = no
  reconciliation, but placement only at the end of the entry.
- **What else is planned for the TOC?** If it stays with content below the title of entries without children, the API
  solution is sufficient.
- **How often is `@open-pioneer/toc` updated?** Frequent updates argue against the fork.
- **How much DOM hooking into third-party components is acceptable to the team?**

## Self-criticism

I should have checked the imperative API (`onReady` / `TocApi`) before forking. Then the detour via
fork and rollback could have been avoided. Both variants now exist side by side (`dashboard` with fork, `toc-native`
without). The decision can therefore be made based on running code; the other branch is discarded afterwards.
