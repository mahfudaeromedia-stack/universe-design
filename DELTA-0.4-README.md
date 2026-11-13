# Vector Studio — Delta 0.4.0

## Base
Apply this delta to the GitHub repository **after** 0.3.3 (all previous 0.2, 0.3 and deploy fixes). The ZIP contains changed and new files only, in repository-relative paths. Do not replace the repository with the ZIP.

## Modified
- `src/App.tsx` — substantive editor interaction implementation and grouped workspace
- `src/model.ts` — path anchors, rotation/flip and drawing tool schema additions
- `src/store.ts` — transient shape creation, avoids empty history entries
- `src/io.ts` — preserve object rotate/flip in exported SVG
- `src/style.css` — grouped tools and panels
- `package.json` — optional `test:geometry` script
- `HISTORY.md` — single consolidated history (replace existing)

## New
- `src/geometry.ts` — pure Bézier geometry and transforms
- `tests/geometry.test.mjs` — four executable geometry tests

## Explicit deletion list
None.

## Workflows implemented
1. Pen (P): click to place anchors; click-and-drag to create opposing control handles. Press Enter to finish an open Bézier path; click close to the first anchor to finish closed. Escape cancels an unfinished path.
2. Selection (V): click/select object, drag to move, drag eight perimeter handles to resize, drag round handle above selection to rotate. Shift + corner drag preserves aspect ratio.
3. Direct (A): click an existing **new-style Bézier** path, then drag individual anchors or in/out control handles.
4. Rectangle, ellipse, line, polygon and star tools, tool grouping, working File/Edit/Object/View menus, duplicate (Ctrl+D), numeric transform, flip, artboard center alignment, layer visibility and order, grid and optional 10px snapping. Press H or Space-drag to pan.
5. `.vsdoc` save and SVG/PNG exports remain connected to the model; version 2 document schema remains backward-compatible.

## Known limitations / unverified
- Working through the browser with real pointer devices and mobile touch has **not** been verified. Test zoom 50/100/200%, pan, drag, rotate, resize, Pen, Direct Selection, save/reopen and SVG/PNG export on Netlify before calling release ready.
- In 0.3.3 the Pen paths were simple `d` strings; direct anchor editing applies to paths created in 0.4 with serializable anchor metadata, not automatically to arbitrary imported SVG path strings.
- This milestone does **not** implement Illustrator/Photoshop feature parity, multiple-object selection, full Pathfinder, hierarchical groups, gradients, masks, raster retouching, PDF/PSD import/export or cloud syncing. Pro access is not yet active.
- npm install failed with `EAI_AGAIN` (DNS access to npm registry not available). **Production build and UI tests are not certified**. Four geometry tests passed; TypeScript syntax transpilation passed for changed TS/TSX files; isolated `tsc` passed for geometry and model.

## Verification and deploy
At the repository root, after copying the delta files:

```bash
npm install
npm run test:geometry
npm run build
```

Then commit to `main`; Netlify uses the existing `npm run build` and `dist` settings. If either command fails, stop and fix the reported error before trusting the deployment. No changes to Firebase/Netlify settings required by this delta. GitHub remains under user manual control.
