import {runConfirmedLinks} from './add-confirmed-links.mjs';

// Thin wrapper kept for existing references. The checked scholar essays now live
// in data/confirmed-links.json and are applied by scripts/add-confirmed-links.mjs.
await runConfirmedLinks({sites: ['jesperjuul', 'radicalphilosophy']});
