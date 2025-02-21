export interface Location2 {
    id: string;
    type:
        | 'regular'
        | 'loose_crystal'
        | 'gossip_stone'
        | 'trial_treasure'
        | 'rupee'
        | 'tadtone'
        | 'beedle_shop'
        | 'gear_shop'
        | 'potion_shop'
        | 'tr_cube'
        | 'tr_dummy';
    name: string;
    originalItem: string | undefined;
    containedAuxItem: string | undefined;
}

export interface LocationAccess2 {
    locationId: string;
    isPrimaryAccess: boolean;
    parentArea: string;
    requirementsIdx: number;
}

export interface Event2 {
    id: string;
}

export interface EventAccess2 {
    eventId: string;
    parentArea: string;
    requirementsIdx: number;
}

export function getLocationType(
    checkName: string,
    checkType: string | null,
): Location2['type'] {
    if (!checkType) {
        return 'regular';
    }

    if (checkType.includes('Rupee')) {
        return 'rupee';
    } else if (checkType.includes('silent realm')) {
        return 'trial_treasure';
    } else if (checkType.includes('Loose Crystals')) {
        return 'loose_crystal';
    } else if (
        checkType.includes('Beedle') &&
        checkType.includes('Shop Purchases')
    ) {
        return 'beedle_shop';
    } else if (checkType.includes('Gear Shop Purchases')) {
        return 'gear_shop';
    } else if (checkType.includes('Potion Shop Purchases')) {
        return 'potion_shop';
    } else if (
        checkType.includes('Tadtones') &&
        !checkName.includes("Water Dragon's Reward")
    ) {
        return 'tadtone';
    } else {
        return 'regular';
    }
}
