import type { Location2 } from './logic2/Location';
import type { RawLogic } from './UpstreamTypes';

export type LinkedEntrancePool = keyof RawLogic['linked_entrances'];
export type TrackerLinkedEntrancePool =
    | LinkedEntrancePool
    | 'dungeons_unrequired';

/**
 * Is this a check that can contain mostly any random item, assuming it is unbanned?
 */
export function isRegularItemCheck(type: Location2['type']): boolean {
    switch (type) {
        case 'regular':
        case 'trial_treasure':
        case 'rupee':
        case 'tadtone':
        case 'beedle_shop':
        case 'gear_shop':
        case 'potion_shop':
            return true;
        case 'loose_crystal':
        case 'gossip_stone':
        case 'tr_cube':
            return false;
    }
}

export interface EntranceLinkage {
    /** Deep Woods\Exit to SV -> SV\Exit to Deep Woods  */
    exits: [outsideExit: string, insideExit: string];
    /** SV\Main Entrance -> Deep Woods\Entrance from SV  */
    entrances: [insideEntrance: string, outsideEntrance: string];
}
