import { District } from '../models/locationModel.js';
import { ISTANBUL_DISTRICTS } from '../data/istanbul-districts.js';

const REGION = 'istanbul';

/**
 * Seed Istanbul districts only (no country / province cascade).
 */
export const initLocations = async () => {
    const existing = await District.countDocuments({ region: REGION });
    if (existing >= ISTANBUL_DISTRICTS.length) {
        return;
    }

    console.log('📍 Seeding Istanbul district reference data...');

    for (const name of ISTANBUL_DISTRICTS) {
        await District.findOneAndUpdate(
            { region: REGION, name },
            { region: REGION, name },
            { upsert: true, new: true }
        );
    }

    console.log(`✅ ${ISTANBUL_DISTRICTS.length} Istanbul districts ready`);
};
