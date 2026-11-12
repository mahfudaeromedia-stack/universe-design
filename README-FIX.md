# Vector Studio 0.3.2 — Netlify missing Vite entry

Netlify log: `Could not resolve entry module "index.html"` during `vite build`.

The original `vector-studio-foundation.zip` contained root `index.html`, which was not included in the prior delta handoffs. The original entry was restored without modification.

Upload **`index.html` to the GitHub repository root**, alongside `package.json`, `vite.config.ts`, and `netlify.toml` (not in `src/`, `public/`, or a zip folder). Replace the root `HISTORY.md` with the included version. `README-FIX.md` is only an explanatory note and need not be committed.

Commit to the `main` branch. Netlify should redeploy automatically if the repository's automatic deployments are enabled.

Changed/new: `index.html` (restored), `HISTORY.md` (updated). Deleted: none.

Verification: matched `index.html` byte-for-byte with original foundation; this fixes the observed missing-entry error. Full production build and live app not yet verified.
