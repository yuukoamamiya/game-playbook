import {runConfirmedLinks} from './add-confirmed-links.mjs';

// Thin wrapper kept for existing references. The confirmed Aftermath links now
// live in data/confirmed-links.json and are applied by scripts/add-confirmed-links.mjs.
await runConfirmedLinks({sites: ['aftermath']});
