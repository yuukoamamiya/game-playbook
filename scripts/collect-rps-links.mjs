import {runConfirmedLinks} from './add-confirmed-links.mjs';

// Thin wrapper kept for existing references. The confirmed Rock Paper Shotgun
// links now live in data/confirmed-links.json (scripts/add-confirmed-links.mjs).
await runConfirmedLinks({sites: ['rockpapershotgun']});
