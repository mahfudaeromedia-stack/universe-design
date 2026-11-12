# Vector Studio 0.3.1 — Netlify TS5083 fix

Observed build failure: `error TS5083: Cannot read file '/opt/build/repo/tsconfig.json'`.

The original foundation ZIP included 3 build configuration files, but the delta ZIPs 0.2 and 0.3 omitted them. This recovery delta provides them without changing application source.

Upload files into the **root** of GitHub repository `mahfudaeromedia-stack/universe-design` (same level as `package.json` and `netlify.toml`):

- `tsconfig.json` (new/missing)
- `tsconfig.app.json` (new/missing)
- `vite.config.ts` (new/missing)
- `HISTORY.md` (updated)

`README-FIX.md` is a handoff note; it does not need to be committed.

**Deleted files:** none.

Commit to `main`; Netlify should automatically start a new build when continuous deployment is active. Build command: `npm run build`; publish directory `dist`.

**Verification status:** Source files match original foundation configuration; no claim of successful Netlify build until new deploy log confirms it. If next build fails, review first TypeScript or Vite error and avoid changing Netlify configuration speculatively.
