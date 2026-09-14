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

- Keep the showcase data in `src/data/games.ts`.
- Keep the game record fields stable. Add a new field only when it is useful for filtering or comparison.
- Never edit generated output or invent game scores.

## AI maintenance rules

- Preserve the existing information architecture unless the user asks for a redesign.
- Prefer editing `src/data/games.ts` over changing React components.
- When adding a game, keep the existing `Game` type shape.
- Keep the site deployable through Cloudflare Pages with `npm run build`.
