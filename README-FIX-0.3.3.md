# Vector Studio — Editor Interaction Fix 0.3.3

## Root cause (verified in source)
`src/App.tsx` calculated coordinates from `getBoundingClientRect()` and divided by `zoom`, even though the SVG was already scaled via CSS. With responsive sizing this mixed screen pixels and SVG viewBox units, causing inaccurate object placement and movement.

## Changes
- `src/App.tsx`: screen-to-SVG mapping via inverse `getScreenCTM()`, with viewBox-based fallback; pointer capture for drag gestures; stop only on pointer up/cancel; don't generate a redundant interaction history entry for shape creation; correct outdated preview label and local autosave footer.
- `src/style.css`: pointer/selection touch safeguards; board-wrap flex sizing.
- `HISTORY.md`: recorded fix.

## Files to upload
Place `src/App.tsx`, `src/style.css`, and `HISTORY.md` at the SAME paths in GitHub branch `main`. `README-FIX-0.3.3.md` is reference documentation. No deletions; no Firebase/Netlify setting changes.

## Verification checklist on Netlify (required)
1. At 100%, draw rectangle/ellipse at each corner and center; starting corner must follow pointer.
2. At 50%, 150%, 200%, repeat; align start and end with pointer.
3. Resize desktop browser narrow/wide; repeat shapes.
4. Select an object and move it at every zoom; initial pointer offset must remain stable.
5. Begin drawing near the artboard edge and move pointer outside; pointer release must finish the gesture.
6. Undo once after drawing a rectangle; object should disappear. Undo once after moving an existing object; return to original position.
7. Refresh project; verify saved geometry is retained. Verify Google Login and Resize Studio unchanged.

## Status
Source-level diagnosis confirmed and patch prepared. `npm install` timed out in the execution environment, so TypeScript production build and real-browser pointer interaction tests were NOT completed here. Do not treat the fix as release-verified before running the above tests.

## Professional editor scope still missing
True cubic Bézier Pen Tool and Direct Selection anchor editing, object bounding-box handles, drag-resize and rotation, multiple artboards, pathfinder, masks, gradients, typography system, rulers/guides/snapping, advanced raster adjustments and brushes, and robust import/export. These require planned functionality milestones, not UI-only changes.
