# Vector Studio 0.3.0 — Delta handoff

Base: original `vector-studio-foundation.zip` **with 0.2.0 delta already applied**. This ZIP contains only files added/changed in 0.3.0. Merge the files into the repository root, retaining the directory hierarchy. No deletions.

## Changed
- `package.json` — Firebase Web SDK, version
- `src/main.tsx` — app entry to authenticated web shell
- `src/App.tsx` — removed legacy global localStorage load/save (now saved per active project in shell)
- `src/store.ts` — ES2020-compatible undo indexing
- `src/style.css` — dashboard, sign-in, and resize styles
- `HISTORY.md` — canonical history updated

## New
- `src/auth.ts` — Google sign-in with Firebase (no fake/offline login)
- `src/projects.ts` — IndexedDB project storage (owner UID-scoped in this browser)
- `src/Dashboard.tsx` — project dashboard
- `src/StudioShell.tsx` — login/session and navigation; editor autosave
- `src/ResizeStudio.tsx` — image resize / DPI tool
- `src/imageTools.ts` — Canvas resample and PNG pHYs metadata (CRC calculated)
- `src/vite-env.d.ts` — Vite environment typings
- `netlify.toml` — build and SPA fallback
- `.env.example` — Firebase web config example
- `DELTA-0.3-README.md` — this handoff

## Deletions
None. `src/persistence.ts` is left unused to avoid silent deletion; review migration/removal in next audited milestone.

## Setup
1. Apply 0.2.0 delta first, then this 0.3.0 delta. Push commits to GitHub yourself.
2. Create or use an existing Firebase project. Enable Authentication > Sign-in method > Google; set the project support email.
3. Authentication > Settings > Authorized domains: add the Netlify production hostname. Preview hostnames may need their own authorization.
4. Netlify Site configuration > Environment variables: set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. These are Firebase **public web config**, not service-account keys. Never put service-account JSON or admin secrets in VITE variables.
5. Netlify build command `npm run build`, publish `dist`. `netlify.toml` also specifies this.
6. Locally run `npm install`, `npm run build`, `npm run dev`. If using local Firebase config copy `.env.example` to `.env.local` and fill values.

## Verification status
- **PASS**: syntax transpilation of all TS/TSX files using TypeScript 5.8.3.
- **PASS**: runtime PNG pHYs write/CRC test: 300 DPI yielded 11811 pixels/m and approximately 299.9994 DPI; PNG chunk CRC verified.
- **BLOCKED**: `npm install` timed out in execution environment; no dependency installation, end-to-end TypeScript typecheck or Vite production build was completed.
- **NOT TESTED**: Firebase real Google login, Netlify deploy, browser interactions and IndexedDB behavior.

## Behavioral and security limitations
- Project files live only in the current browser, **not Firebase**; clearing browser storage loses them. `.vsdoc` Save is the backup path. Signed-in UID is used as a local namespace, **not as remote security**.
- No cross-device sync. Google sign-in does not automatically upload files.
- No subscription engine, payment, or Pro unlocking; Basic badge is informational at this stage.
- PNG/JPG/WebP can be opened for pixel resampling; outputs are PNG. Lossless density-only editing currently accepts PNG only. The DPI metadata affects print dimensions, not sharpness.
- High-resolution images may exhaust browser memory; export is limited to 40 million output pixels and each dimension <= 16384.
- Existing Pen Tool / Direct Selection remain foundational, not professional Bézier editing.
- `src/persistence.ts` is legacy and no longer invoked by current App; intentionally preserved pending removal audit.

## Regression checklist on local/Netlify (must run before production)
- Signed-out visitor sees login and cannot open dashboard; missing Firebase config gives explicit setup notice.
- Google popup works for an authorized domain; user name visible; sign out returns to login.
- Create/open/delete project; reload and verify IndexedDB persistence; reopen and confirm edits survived.
- Open existing `.vsdoc`; verify rect, ellipse, text, image, layers, Undo/Redo, SVG/PNG exports.
- Resize PNG/JPG/WebP (pixel counts), toggle linked aspect ratio, export PNG, test 72/96/300 DPI metadata.
- Metadata-only PNG preserves original pixels and file dimensions. Metadata-only JPG/WebP gives a clear unsupported message.
- Verify browser at desktop and narrower widths; inspect JavaScript console and Netlify function/build logs.

## Next milestone
Resolve install/build validation first, test Firebase auth on Netlify preview, then add project rename, safer persistence/quotas and professional Pen/anchor editing. Cloud sync should be designed with per-user Firestore/Storage rules before enablement.
