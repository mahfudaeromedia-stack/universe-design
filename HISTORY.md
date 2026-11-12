# Vector Studio Development History

## 0.2.0 — Foundation hardening + raster design baseline
- Split document model, persistence, file I/O, and Zustand editor state into independent modules.
- Added versioned document schema and migration from 0.1 array-only documents.
- Fixed drag history so one pointer gesture creates one undo step instead of one step per pointer move.
- Added raster image layers (PNG/JPEG/WebP import) for Photoshop-style mixed vector/raster compositions.
- Added layer visibility, locking, ordering, opacity, and blend modes.
- Preserved SVG/PNG export and `.vsdoc` document workflow while upgrading them to use the versioned document model.
- Kept all existing rectangle, ellipse, path, text, selection, move, property, autosave, undo/redo, and export behavior.
