import {runConfirmedLinks} from './add-confirmed-links.mjs';

// Thin wrapper kept for existing references. RPGamer's sitemap contains
// malformed XML, so the reviewed links live in data/confirmed-links.json and are
// applied by scripts/add-confirmed-links.mjs.
await runConfirmedLinks({sites: ['rpgamer']});
