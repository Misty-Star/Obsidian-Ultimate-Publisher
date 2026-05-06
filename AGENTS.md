# Repository Guidelines

## Project Structure & Module Organization
`main.ts` is the plugin entrypoint and bundles to the root `main.js`; do not edit the generated bundle by hand. Core publishing logic lives in `src/core/`, provider implementations live in `src/providers/`, and Obsidian UI code lives in `src/ui/` with modal and view subfolders. Shared settings and types are in `src/settings.ts` and `src/types.ts`. Plugin metadata stays in `manifest.json`, and shared styles live in `styles.css`. Tests are under `tests/`, with the Obsidian API shim in `tests/support/obsidian.ts`.

## Build, Test, and Development Commands
- `pnpm install` - install dependencies with the repo's pinned pnpm version.
- `pnpm dev` - run esbuild in watch mode and rebuild `main.js` on changes.
- `pnpm build` - create a production bundle for the Obsidian plugin.
- `pnpm test` - run the Vitest suite in `tests/**/*.spec.ts`.
- `pnpm exec tsc --noEmit` - run a strict type check before opening a PR.

## Coding Style & Naming Conventions
Use TypeScript with strict typing and 2-space indentation. Follow the existing style: double quotes, semicolons, `camelCase` for functions and variables, `PascalCase` for classes, views, and modal components, and descriptive file names such as `publishWorkflow.ts` or `PublisherDashboardView.ts`. Keep provider-specific behavior inside `src/providers/` and UI-only concerns inside `src/ui/`.

## Testing Guidelines
Write Vitest specs next to related behavior in `tests/` using the `*.spec.ts` suffix, for example `tests/publishWorkflow.spec.ts`. Prefer focused unit tests for pure helpers in `src/core/`, plus workflow tests for multi-target publish behavior. Reuse `tests/support/obsidian.ts` instead of mocking the Obsidian API from scratch. New features should include tests for success paths and at least one failure or edge case.

## Lore Commit Protocol

Every commit message must follow the Lore protocol: a concise decision record using git-native trailers.

### Format

```text
<intent line: why the change was made, not what changed>

<optional concise body: constraints and approach rationale>

Constraint: <external constraint that shaped the decision>
Rejected: <alternative considered> | <reason for rejection>
Confidence: <low|medium|high>
Scope-risk: <narrow|moderate|broad>
Directive: <forward-looking warning for future modifiers>
Tested: <what was verified>
Not-tested: <known gaps in verification>
```

### Rules

- Intent line first; describe why, not what.
- Use trailers only when they add decision context.
- Use `Rejected:` for alternatives future agents should not re-explore.
- Use `Directive:` for warnings, `Constraint:` for external forces, and `Not-tested:` for known verification gaps.

## Pull Request Guidelines
PRs should explain user-visible impact, list verification commands run, and link related issues when available. Include screenshots or GIFs for settings, ribbon menu, dashboard, or modal UI changes.

## Security & Configuration Tips
Never commit real WordPress, Yuque, or web publishing credentials. Use sanitized examples in docs and tests, and keep secrets in Obsidian plugin settings rather than checked-in files.
