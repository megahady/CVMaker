
<img width="1909" height="990" alt="image" src="https://github.com/user-attachments/assets/d7434358-ea20-4f0a-90de-3c9d39911ef5" />


# CVMaker

A local desktop application for building academic CVs through a structured form
editor — no manual LaTeX required. Data stays on your machine; no internet
connection is needed at runtime.

```
User → Structured Editor → CV Data (Zod-validated) → Live Preview (HTML/CSS)
                                                 ↘ LaTeX Generator → .tex → XeLaTeX → PDF
```

## Status

**All 10 phases are complete** (93 Vitest tests passing). The CV editor,
`.cv` save/open/autosave, live HTML preview (Traditional/Modern/Compact),
LaTeX generation, and the PDF export pipeline (Rust compiles temp `.tex` with
XeLaTeX under a 120 s timeout) are built and verified. The Rust backend
compiles clean with rustc/cargo 1.99 + MSVC 14.44, and release installers are
produced from `npm run tauri build`.

Developer setup (already done on this machine, needed on a fresh one):

1. Install Rust: `winget install Rustlang.Rustup`
2. Install MSVC C++ Build Tools:
   `winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"`
3. Verify: `cargo --version`, then run `npm run tauri dev`

Until then `npm run dev` exercises everything except native dialogs/PDF:
file buttons are disabled (file hints shown), but **Export .tex works in the
browser too** — it downloads the same generated file. **Export .pdf**, native
file dialogs, and autosave-on-close need the desktop app.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 1420 (frontend only) |
| `npm run build` | Type-check (`tsc`) + production bundle |
| `npm test` | Vitest unit tests |
| `npm run tauri dev` | Full desktop app (requires Rust toolchain) |
| `npm run tauri build` | Installer for Windows/macOS (Phase 10) |

## How the pieces fit together

### What runs where

| Layer | Technology | Responsibility |
|---|---|---|
| UI | React + TypeScript | Rendering, forms, layout. **No business logic.** |
| Styling | Tailwind CSS + shadcn/ui | Design system components (`src/components/ui/`) |
| Forms | React Hook Form + Zod | Schema-driven forms, validation |
| State | Zustand | The `CvDocument` object + undo/redo history |
| Native | Rust (Tauri 2) | Filesystem, native dialogs, XeLaTeX process |
| Preview | React/CSS | Live rendering of CV data (never LaTeX compilation) |
| Export | Pure TypeScript → Rust | `.tex` generation in TS; Rust only writes files and runs XeLaTeX |

### Tauri ↔ React communication

React never touches the filesystem. It calls typed IPC functions:

```ts
// frontend (TypeScript)                // Rust
const path = await invoke("save_cv",    // #[tauri::command]
  { path, contents });                  //   std::fs::write(...)
```

The boundary is intentionally narrow: **Rust does IO and process execution,
TypeScript does everything else.** LaTeX generation is pure string building over
CV data, so it lives in TypeScript where Vitest can test it without a Rust
compile cycle. Rust's `export_pdf` command will spawn
`xelatex -interaction=nonstopmode <file>` with fixed arguments — never a shell,
never a command derived from user input.

### Packaging

`npm run tauri build` compiles the Rust binary, embeds the Vite bundle, and
produces a signed installer (`.msi`/`.exe` on Windows, `.dmg`/`.app` on macOS).
The shipped app contains no Node.js runtime — only the compiled binary and the
bundled frontend.

## Architecture

```
src/
├── features/cv/
│   ├── schema/        Zod: CvDocument + FieldDefinition (source of truth)
│   ├── sections/      SectionDefinition registry (add sections here, no editor changes)
│   ├── editor/        Generic form generator + section manager
│   ├── store/         Zustand document store + history (undo/redo)
│   └── format.ts      Shared formatting helpers (preview + LaTeX)
├── features/preview/  HTML preview renderers + per-template class maps
├── features/latex/    escapeLatex, generator, per-section renderers, per-template layouts
├── features/persistence/  CvRepository interface, file backend, autosave, export actions
└── tauri/             typed invoke() wrappers (only place that knows about Rust)
src-tauri/src/commands.rs    open/save/export — thin, validated commands
```

Two rules keep the codebase extensible:

1. **No per-section components.** One `FieldRenderer` switches on field *type*
   (`text`, `select`, `year`, …); preview/LaTeX output is selected by a
   `renderer` key with a generic fallback. A custom section added by the user
   at runtime needs zero new code.
2. **Persistence behind an interface.** `.cv` files (versioned JSON,
   `schemaVersion: 1`) are read/written through `CvRepository`, so SQLite can be
   added later by implementing the same interface.

## Building & testing

- Frontend tests: `npm test` (95 Vitest tests) · type-check + prod bundle: `npm run build`
- LaTeX demo regeneration: `npx vite-node scripts/generate-sample.ts` (needs XeLaTeX on PATH)
- One `.tex` per template from a real `.cv`: `npx vite-node scripts/export-templates.ts [outDir] [cvFile]` — compiles with XeLaTeX, all 13 templates verified
- Release installers: `npm run tauri build`
  - Windows (verified): `src-tauri/target/release/bundle/msi/CVMaker_0.1.0_x64_en-US.msi` + `nsis/CVMaker_0.1.0_x64-setup.exe`
  - macOS: `src-tauri/target/release/bundle/dmg/*.dmg` + `app/*.app`
  - Standalone binary: `src-tauri/target/release/cvmaker.exe`
- Bundler config lives in `src-tauri/tauri.conf.json` (product "CVMaker", en-US WiX + NSIS, macOS ≥ 10.15).

## Roadmap

| Phase | Deliverable | Needs Rust? |
|---|---|---|
| ✅ 1 | Scaffold: Tauri 2 + React + TS + Vite + Tailwind + shadcn + Zod + Zustand + RHF | scaffold only |
| ✅ 2 | CV data model + Zod schemas + migration skeleton | no |
| ✅ 3 | Extensible section-definition system | no |
| ✅ 4 | Editor UI (generated forms, reorder, enable/disable) | no |
| ✅ 5 | `.cv` save/open + autosave/recovery (frontend verified; Rust commands written) | **yes** |
| ✅ 6 | Live HTML/CSS preview + template switching | no |
| ✅ 7 | LaTeX generator + Traditional template (`.tex` export) | write: **yes** |
| ✅ 8 | XeLaTeX PDF export with error handling (temp dir, 120 s timeout, log tail) | **yes** |
| ✅ 9 | Modern + Compact templates (preview + LaTeX layouts) | no |
| ✅ 10 | Installer config (branding, MSI/NSIS + DMG/App) — build verified on Windows | **yes** |
| ✅ 11 | Ten more single-column academic templates (preview + LaTeX layouts, XeLaTeX-verified) | no |

## Templates

All 13 layouts are single-column. Preview styling lives in `features/preview/templates.ts`,
LaTeX setups in `features/latex/generate.ts`, and the dropdown is driven by the registry.

| Template | Style |
|---|---|
| Traditional Academic | centered name, ruled serif headings (default) |
| Modern | sans-serif, sky accent, flushed-left name |
| Compact | tight serif, minimal margins, one line per entry |
| Classic Serif | centered small-caps name, centered small-caps headings, Times |
| Formal | centered name, slate headings with rule, Times |
| Executive | narrow margins, gray small-caps headings, tight serif |
| Academic | Libertine serif, olive accent, small-caps headings |
| Minimalist | airy sans (Helvetica), wide margins, light headings |
| Minimal Sans | clean ATS-friendly sans, no color |
| Concise Academic | 10 pt Times, tightest spacing, small-caps headings |
| Elegant | Palatino with bronze accent, generous margins |
| Researcher | Swiss Schoolbook serif, teal accent, ruled headings |
| Clean | Swiss Schoolbook serif, loose leading, muted headings |
