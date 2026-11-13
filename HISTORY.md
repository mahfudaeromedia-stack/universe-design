# Vector Studio Development History

## 0.2.0 — Foundation hardening + raster design baseline
- Split document model, persistence, file I/O, and Zustand editor state into independent modules.
- Added versioned document schema and migration from 0.1 array-only documents.
- Fixed drag history so one pointer gesture creates one undo step instead of one step per pointer move.
- Added raster image layers (PNG/JPEG/WebP import) for Photoshop-style mixed vector/raster compositions.
- Added layer visibility, locking, ordering, opacity, and blend modes.
- Preserved SVG/PNG export and `.vsdoc` document workflow while upgrading them to use the versioned document model.
- Kept all existing rectangle, ellipse, path, text, selection, move, property, autosave, undo/redo, and export behavior.

## 0.3.0 — Web app foundation (partial, verification pending)
- Added Firebase Authentication Google popup sign-in and a fail-closed setup screen when Firebase environment values are missing.
- Added a signed-in project dashboard with local IndexedDB create/open/delete and a per-user UID namespace.
- Routed editor project autosave through IndexedDB rather than one global `localStorage` document.
- Added functional Image Resize & DPI tool: actual Canvas pixel resampling to PNG and lossless PNG pHYs DPI metadata updates without changing pixel data.
- Added Netlify SPA redirect and build configuration and `.env.example`.
- Added responsive dashboard/login/image-tool styles.
- Basic is the only enabled plan; Pro billing, entitlement enforcement, cloud sync, and photo filters are NOT implemented.
- Validation: TypeScript transpile syntax check passed for all TS/TSX source files; PNG metadata CRC/density runtime test passed; npm install timed out in sandbox, so tsc production typecheck, Vite build, browser UI and Firebase login are NOT validated.

## 0.3.3 — Editor pointer coordinate correction (patch; awaiting browser verification)
- Corrected screen/client to SVG document coordinate mapping using inverse SVG screen CTM and a viewBox fallback.
- Captured pointer during object creation and move; removed premature stop on pointer leave.
- Removed redundant undo snapshot on shape creation; retain one-gesture undo for moves.
- No Firebase/Netlify changes; no files deleted.
- Production build and browser interaction verification outstanding (dependency installation timeout).
