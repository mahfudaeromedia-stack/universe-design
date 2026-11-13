# Vector Studio 0.4.1

Apply this delta over 0.4.0. Extract its contents into the repository root and keep the paths intact. Remove `src/ResizeStudio.tsx` from GitHub when committing. The PNG tools now run in the editor.

## Workflow

- Dashboard → **Open Image** creates a local project with the image at its original pixel dimensions. **File → Place image** adds an image to the open project.
- Select a raster layer → **Image → Image Size** (also in Properties). Turn on Resample to change source pixel dimensions. With Resample off, a PNG keeps its original pixel data and receives new PPI metadata. The layer's X, Y, Width, and Height still govern placement on the artboard.
- **Image → Canvas Size** changes artboard dimensions, anchored at the top left. Existing layers retain their placement. Use Undo/Redo to revert or restore the change.
- **Image → Export Selected Layer PNG** downloads the raster source. It excludes other layers and the selected layer's composition transforms and appearance.
- **File → Export PNG** renders the visible composition at the chosen output dimensions and PPI. Export settings apply to the current download. SVG continues to use vector document dimensions.

## Delta contents

- Updated `package.json`, `HISTORY.md`, `src/App.tsx`, `src/Dashboard.tsx`, `src/StudioShell.tsx`, `src/imageTools.ts`, `src/io.ts`, `src/model.ts`, `src/projects.ts`, `src/store.ts`, and `src/style.css`.
- Added `src/ImageDialog.tsx` and `src/raster.ts`.
- Obsolete file to delete explicitly: `src/ResizeStudio.tsx`.
- This handoff note is optional in the repository.

## Build and verification

Run `npm install`, `npm run test:geometry` and `npm run build`. For local development, copy `.env.example` to `.env.local`, fill the Firebase web values, and run `npm run dev`. Push to `main` for the existing Netlify pipeline.

TypeScript and Vite production build passed. Geometry tests passed 4/4. Local raster checks verified PNG pixel payload preservation at 300 PPI and resampling to 80 × 60 at 96 PPI. Store checks verified artboard resize, layer placement, undo, redo and no-op history. Chromium could not start in this execution environment. Browser workflows, Firebase sign-in and the Netlify deploy remain unverified.

Metadata-only editing supports PNG. JPEG and WebP are decoded and written as PNG for image size or layer export. The editor has no crop/mask or adjustment layer workflow in this delta. Vector pathfinder is outside this delta.
