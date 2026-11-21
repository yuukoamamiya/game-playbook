# Playbook design system

## Direction

The site is a personal game decision archive: calm, editorial, compact, and easy to scan. It should feel like a carefully maintained field notebook rather than a generic documentation template.

## Visual language

- Use a warm paper background with near-black text.
- Use one restrained green accent for links, positive recommendations, and active states.
- Prefer generous whitespace, thin borders, compact metadata, and clear content hierarchy.
- Use rounded corners sparingly; avoid glossy gradients, loud illustrations, and dashboard-like decoration.
- Headings should feel editorial; metadata should feel technical and quiet.

## Content rules

- Treat `data/metacritic-games.json` as the exchange layer between scraping and AI tools. It provides the candidate list and review links.
- Treat `content/reviews/en/*.md` as private English source material for AI translation. This directory must stay outside `docs/`.
- Treat `docs/games/*.mdx` as the public Chinese translation organized by media tabs. Do not add personal notes or paste the English source review into these files.
- Keep the game record fields stable. Add a new field only when it is useful for filtering or comparison.
- Never edit generated output or invent game scores.

## Accessibility and performance rules

- Review illustrations use `<button>` wrapping `<img>` (not `img[role=button]`), restore focus on dialog close, and trap nothing behind `inert` background gaps.
- Global `:focus-visible` outline is required; `prefers-reduced-motion: reduce` disables lightbox fade and card lift.
- Game grid uses `content-visibility: auto` with `contain-intrinsic-size` to keep 200+ cards cheap to scroll.
- Document pages dynamically import per-slug `src/generated/versions/<slug>.json` and `src/generated/reviews/<slug>.json` instead of the full `games.json` / `reviews.json`.
- Pagefind CSS loads non-blocking (`media="print"` + onload); navbar search only exists in production builds.

## AI maintenance rules

- Preserve the existing information architecture unless the user asks for a redesign.
- Prefer editing the JSON for metadata and review links, and editing a game document for the relevant media translation tab.
- When adding a game, copy `docs/games/_template.mdx` and keep its frontmatter shape.
- Keep the site deployable through Cloudflare Pages with `npm run build`.
