# Vector Studio — Delta 0.2.0

Copy these files into the repository root, preserving paths:
- `src/App.tsx`
- `src/store.ts`
- `src/model.ts` (new)
- `src/persistence.ts` (new)
- `src/io.ts` (new)
- `src/style.css`
- `HISTORY.md` (new)

No files should be deleted for this delta.

Then run:
```bash
npm install
npm run build
npm run dev
```

Verification checklist:
1. Existing rectangle/ellipse/text/path creation still works.
2. Select and drag an object; one drag should consume only one Undo step.
3. Place Image accepts PNG/JPEG/WebP and creates a raster layer.
4. Layer eye toggles visibility.
5. Layer lock prevents dragging/property edits/deletion.
6. Layer up/down changes stacking order.
7. Opacity and blend mode visibly affect selected layers.
8. Save `.vsdoc`, reopen it, and confirm raster/vector layers persist.
9. Export SVG and PNG and verify visible layers and composition.
10. Refresh browser and verify local autosave restore.
