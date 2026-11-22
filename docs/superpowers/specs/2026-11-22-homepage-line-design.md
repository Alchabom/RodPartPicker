# Homepage: the line runs down the page

Sub-project 1 of the UX polish pass (branch `oa-ux-polish`). Approved in brainstorming on 2026-11-22.

## Why

- The hero paragraph ("Pick a rod, reel, line, leader and tippet. We check each part…") repeats the headline and reads as generated copy.
- The hero draws a rod with guides and a cast. Below it, "How a rig goes together" (`RigSteps`) explains the same rig in a separate 5-column list. The two don't connect.
- Moving between pages keeps the old scroll position. `BrowserRouter` has no scroll handling, so clicking **Add** halfway down a parts list opens the builder halfway down.

## Goal

A visitor reads the headline and then either starts a build right away, or scrolls and follows the fly line from the rod down through the five parts to a hook and **Start a build**. Recent community builds sit alongside. Every page opens at its top, and Back returns to where you were.

## The UX polish pass (context)

This spec covers sub-project 1 only. Each later sub-project gets its own spec.

1. **Homepage and scroll behavior** (this spec)
2. **Builder flow and parts list:** parts first, with brand as a filter instead of the first decision; build progress; a completion state
3. **Compatibility display:** one clear signal instead of row tint, a "Fits build" badge and a "Recommended" badge that share one gold
4. **Site-wide navigation pass**

## Design

### 1. Hero

- Remove the paragraph from `HomePage.tsx`. The hero is the headline and the two actions: **Start a build** (primary) and **See the Community Rack** (link). Tighten the space so the actions sit directly under the headline.
- **The rod stays exactly as it is now:** the same curved rod, five guides with legs, threaded line, cast loop and the fly dot. The hero fly stays a dot. The existing entrance (text rise, cast draw) is unchanged.
- **New: the slack.** On `lg` and up, a second, static segment of fly line leaves the reel (behind the near ridge) and falls in front of the nearest ridge to the bottom edge of the hero, at the horizontal center (viewBox x = 600, which `xMidYMid slice` always maps to 50% of the width). It is drawn with the cast: it is part of the scene from the first paint, not scroll-driven. It acts as a scroll cue. Its geometry lives in `castGeometry.ts`, next to the rest of the line.
- Below `lg`, the rod, guides and cast are hidden (unchanged), so the slack is hidden too.

### 2. Steps and Recently rigged: one section, two columns

The `RigSteps` and `RecentBuilds` sections merge under one container:

```
lg and up                                       below lg
┌──────────────────────────────┬─────────────┐  ┌────────────────────┐
│ ╲ (bridge from the hero)     │             │  │ How a rig goes …   │
│  ╲_ How a rig goes together  │ Recently    │  │ │ Rod              │
│  ○ Rod                       │ rigged      │  │ ○ …                │
│  ┃ Sets the line weight…     │ ┌─────────┐ │  │ │ Tippet           │
│  ○ Reel                      │ │▢ title  │ │  │ ʖ  [Start a build] │
│  ┃ …                         │ └─────────┘ │  │                    │
│  ○ Line                      │ ┌─────────┐ │  │ Recently rigged    │
│  │ …                         │ │▢ title  │ │  │ ┌────────────────┐ │
│  ○ Leader                    │ └─────────┘ │  │ │▢ title         │ │
│  │ …                         │ ┌─────────┐ │  │ └────────────────┘ │
│  ○ Tippet                    │ │▢ title  │ │  │ …                  │
│  ʖ  [Start a build]          │ └─────────┘ │  └────────────────────┘
│                              │ See all of… │
└──────────────────────────────┴─────────────┘
```

**Left column: the steps on the line.**

- The steps form one vertical list at every width. The `lg:grid-cols-5` row goes away. The heading stays "How a rig goes together". The step lines are the current `STEPS` copy, still mirroring `api/app/compatibility/rules.py`.
- **The line:** it runs down the gutter left of the steps, in `belly`, tapering 4, 4, 3, 2, 1 px (the segment below each step, as in today's `STEPS[].width`).
- **Markers:** each step's marker is a small guide ring in `dorsal-band`, the same as the hero's guides, with the line passing through it. These replace the step numbers. The order is already carried by the `<ol>` and by the line.
- **The bridge (`lg` and up):** a decorative `aria-hidden` SVG at the top of the section continues the slack from the hero's bottom center and swings left into the gutter. It widens from the hero line's width to 4 px, as the line comes toward the viewer. It spans from the gutter to 50% of the section's width, uses `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke`, and has its left edge computed from the `Container`'s `max-w-6xl` and padding. Below `lg` there is no bridge, and the line starts at the first marker.
- **The end of the line:** a dry-fly hook (eye, shank, bend, point, barb) in `dorsal-band`, hanging off the tippet beside the final **Start a build** button. See section 4.

**Right column: Recently rigged.**

- It has the same query, states and 3-build limit as today's `RecentBuilds`. The cards stack vertically and are followed by "See all of the Community Rack".
- The cards are a new `compact` variant of the shared `BuildCard`: the photo on the left, about 2:1 and roughly a third of the card's width; on the right, the title (2 lines max), "by {author} · {date}", the rod with its weight, and the price. The default variant (used by the Rack) is unchanged. The `data-slot="votes"` placeholder stays in both variants; restructuring it for the upvote button remains a sub-project 4 carry-forward.
- `BuildCardSkeleton` gets a matching `compact` variant. The loading skeleton and the empty state ("Nothing on the Rack yet") fit the narrow column. On an error the column renders nothing (as today), and the steps column keeps its width.
- Below `lg`, this column moves under the steps and keeps the compact cards, one per row.

### 3. Scroll reveal

- **Technique:** pure CSS scroll-driven animations, `animation-timeline: view()`, wrapped in `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`. No JavaScript scroll listeners.
- **What moves:**
  - Each line segment and the bridge draw in from the top (`scaleY` 0 → 1 for the segments, `stroke-dashoffset` for the bridge) as they cross into view.
  - Each step's text rises in (the existing `rise` motion: 8 px and opacity) as the line reaches its marker.
  - The hook sways once, a few degrees, as it enters.
- Because the animations are tied to scroll, scrolling back up reverses them.
- **Fallback:** without `view()` support (Firefox today) or with reduced motion on, everything renders in its finished state.
- Keyframes and timeline rules go in `src/styles/index.css`, next to `cast` and `rise`.

### 4. "Fish on": the final Start a build

This only applies to the **Start a build** button at the end of the line. The hero's **Start a build** stays instant.

- It is a real link to `/builder`. Modifier clicks (Cmd/Ctrl/Shift/Alt), clicks other than a primary click, and any click with reduced motion on behave as a normal link and navigate at once.
- A primary click with motion allowed calls `preventDefault` and plays the catch, then calls `navigate('/builder')` 450 ms after the click:
  1. **0 to 120 ms:** the button shows its pressed state, the line goes taut and the hook jerks up. Feedback starts within the first frame.
  2. **120 to 400 ms:** a small brook trout leaps up from below onto the hook, with two splash rings in `halo`. Its colors are tokens only: an `olive` back, a `belly` belly, `spot` spots with `halo` rings and a `stone-card` fin edge.
  3. **450 ms:** navigation.
- Further clicks during the catch are ignored. The timer is cleared on unmount.
- The fish and splash are inline SVG, `aria-hidden`, with no sound and no added text.

### 5. Scroll behavior between pages

Add a `ScrollManager` component in `src/routes/`, rendered once inside `BrowserRouter` (next to `AppRoutes`). It sets `history.scrollRestoration = 'manual'`, records `window.scrollY` per `location.key`, and on each location change:

| Navigation | Behavior |
|---|---|
| `PUSH` | If the URL has a hash with a matching element, scroll to it; otherwise scroll to the top |
| `REPLACE` with a new pathname (redirects) | Same as `PUSH` |
| `REPLACE` on the same pathname | Nothing. `CopyPublishedIntent` and `SaveDraftButton` strip their search params this way and must not jump. |
| `POP` (Back/Forward) | Restore the recorded position after render, best effort (the page may be shorter until its data loads) |

All scrolling is instant (`behavior: 'auto'`), never smooth.

## Units and files

- `src/features/home/components/HomePage.tsx`: remove the paragraph, tighten the spacing, render the merged section.
- `src/features/home/components/RidgeScene.tsx` and `src/features/home/utils/castGeometry.ts`: add the slack.
- `src/features/home/components/RigSteps.tsx`: rewrite as the steps column (line, markers, bridge, hook, catch link).
- `src/features/home/components/CatchLink.tsx` (new): the final Start a build and the fish; owns the click rules and the timer.
- `src/features/home/components/RecentBuilds.tsx`: becomes the right column, using `compact` cards.
- `src/components/shop/BuildCard.tsx` and `BuildCardSkeleton.tsx`: add the `compact` variant.
- `src/routes/ScrollManager.tsx` (new) and `src/main.tsx`: mount it.
- `src/styles/index.css`: add the scroll-driven keyframes and the catch keyframes.

## Testing

All tests are Vitest. jsdom has no layout or scroll timelines, so the tests check structure and behavior, not motion.

- **`HomePage`:**
  - The paragraph is gone.
  - The headline and both actions are still there.
  - The five steps are still listed in order.
  - The entrance tests still pass.
- **`RidgeScene`:** the existing rod and guide tests still pass unchanged. That is the "rod still looks like a rod" guard. The slack is hidden below `lg`.
- **`castGeometry`:** the slack starts at the reel point and ends at (600, 460).
- **`RigSteps`:** the steps are an `<ol>` of five in order; the markers, line, bridge and hook are `aria-hidden`.
- **`CatchLink`** (fake timers, mocked `matchMedia`):
  - A primary click navigates to `/builder` after 450 ms, not before.
  - A second click doesn't navigate twice.
  - Reduced motion navigates at once.
  - A Cmd-click is not prevented.
  - Unmounting clears the timer.
- **`BuildCard` / `RecentBuilds`:**
  - The compact variant shows the title, author and date, rod and price.
  - The default variant is unchanged.
  - The existing `RecentBuilds` tests still pass.
- **`ScrollManager`:**
  - `PUSH` scrolls to the top.
  - `PUSH` with a hash scrolls to the anchor.
  - A same-path `REPLACE` doesn't scroll.
  - `POP` restores the recorded position.
- **Manual check in a real browser** (Chrome and Firefox; 390 px, 1024 px and 1440 px; reduced motion on and off):
  - The bridge lines up with the hero's slack.
  - The reveal scrubs smoothly.
  - The catch plays and then lands on the builder.
  - Back from the builder returns to the steps.
- `pnpm check:contrast` still passes.

## Out of scope

- The builder flow, parts lists and compatibility display (sub-projects 2 and 3).
- Header and navigation changes (sub-project 4).
- Page-to-page transition animations.
