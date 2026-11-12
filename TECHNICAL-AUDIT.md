# Vector Studio — Technical Audit (Foundation ZIP)

## Existing architecture
- React 18 + TypeScript + Vite.
- Zustand single store.
- SVG is the drawing/rendering surface.
- Entire editor behavior was concentrated mostly in `src/App.tsx`.
- Persistence used browser `localStorage`.
- Native document format was a raw JSON array saved as `.vsdoc`.

## Working features found
- Desktop workspace shell.
- Rectangle, ellipse, text, and primitive path creation.
- Object selection and drag movement.
- Basic transform fields.
- Fill, stroke, and stroke-width editing.
- Flat layer list.
- Delete object.
- Undo/redo.
- Keyboard shortcuts for several tools.
- Local browser autosave.
- `.vsdoc` JSON open/save.
- SVG and PNG export.

## Broken / misleading / incomplete features
- Pen tool created only a trivial straight segment; no real Bézier workflow.
- “Direct select” behaved effectively like normal selection; no anchor editing.
- History captured every drag update, causing excessive Undo steps.
- File/Edit/Object/Type/View menu labels were largely non-functional UI.
- No visibility/lock/reorder controls in layers.
- No raster/image layer workflow.
- No multiple artboards, guides, rulers, snapping engine, pathfinder, clipping masks, compound paths, typography engine, gradients, brushes, PDF support, IndexedDB, or Firebase sync.

## Technical debt
- Document model was coupled directly to UI and store concepts.
- No versioned document schema or migration layer.
- Export logic depended on live SVG DOM markup.
- Application logic was highly concentrated in one component.
- No test suite.
- No package lock was included in the supplied ZIP.
- No development history file.

## Build/dependency status
- `package.json` is structurally valid and defines React, Zustand, Lucide, TypeScript, and Vite dependencies.
- The supplied ZIP does not contain `node_modules`.
- Dependency installation in the execution environment did not complete before timeout, so a final production build could not be honestly certified here.
- TypeScript did expose refactor-specific `verbatimModuleSyntax` import issues during validation; those were corrected before handoff.

## Future-development risks
- Real Bézier editing requires a dedicated geometry/path model, not continued ad-hoc SVG string manipulation.
- Boolean/pathfinder operations should use a deterministic geometry layer independent of React/SVG DOM.
- Large embedded raster data URLs will eventually exceed practical localStorage limits; IndexedDB is mandatory before serious raster/photo workflows.
- Undo/redo should evolve from document snapshots toward explicit commands for large documents.
- Multiple artboards need a scene/document coordinate system before tools become more complex.
- PDF/AI/EPS compatibility should be treated as import/export adapters, not mixed into the core document model.

## Implemented in Delta 0.2.0
- Versioned document model separated into `src/model.ts`.
- Persistence adapter separated into `src/persistence.ts`.
- File/export helpers separated into `src/io.ts`.
- Drag interaction now records one Undo state per gesture.
- PNG/JPEG/WebP placement as raster image layers.
- Photoshop-style layer basics: visibility, lock, stacking order, opacity, and blend modes.
- Existing vector drawing and file workflows retained.

## Recommended next milestone
Phase 2 should focus on the professional vector core before adding more Photoshop-like filters:
1. true Pen Tool state machine;
2. cubic Bézier nodes and handles;
3. Direct Selection anchor editing;
4. transform handles and bounding-box resize/rotate;
5. geometry service layer;
6. snapping primitives;
7. tests for path editing and undo/redo.

After that, continue the Photoshop-oriented branch with IndexedDB-backed raster layers, crop, masks, non-destructive brightness/contrast/saturation, blur/sharpen, and image resize/canvas size.
