import type {
    RecursiveRequirement3,
    Requirement2,
} from '../../logic/logic2/Requirement';

export type TooltipRequirement2 = Requirement2 & {
    type: 'item' | 'rupeeCapacity' | 'gratitudeCrystals' | 'trick' | 'auxItem';
};

export type RecursiveTooltipRequirement2 =
    RecursiveRequirement3<TooltipRequirement2>;

export interface BitIndex {
    itemBits: Record<string, number>;
    walletCapBits: Record<string, number>;
    crystalBits: Record<string, number>;
    trickBits: Record<string, number>;
    auxItemBits: Record<string, number>;
    reverseIndex: TooltipRequirement2[];
    counter: number;
}

export function createBitIndex(): BitIndex {
    return {
        itemBits: {},
        walletCapBits: {},
        crystalBits: {},
        trickBits: {},
        auxItemBits: {},
        reverseIndex: [],
        counter: 0,
    };
}

export function getRequirementBit(index: BitIndex, req: TooltipRequirement2) {
    /*
    TODO optimization: This keeps constructing strings every time
    we do the partial evaluation, maybe we can be smarter about this
    by preprocessing some requirements
    */
    const bump = () => {
        return index.counter++;
    };

    switch (req.type) {
        case 'item': {
            const id = req.name + '_' + req.count;
            if (id in index.itemBits) {
                return index.itemBits[id];
            } else {
                const idx = bump();
                index.itemBits[id] = idx;
                index.reverseIndex.push(req);
                return idx;
            }
        }
        case 'rupeeCapacity': {
            const id = req.amount.toString();
            if (id in index.walletCapBits) {
                return index.walletCapBits[id];
            } else {
                const idx = bump();
                index.walletCapBits[id] = idx;
                index.reverseIndex.push(req);
                return idx;
            }
        }
        case 'gratitudeCrystals': {
            const id = req.amount.toString();
            if (id in index.crystalBits) {
                return index.crystalBits[id];
            } else {
                const idx = bump();
                index.crystalBits[id] = idx;
                index.reverseIndex.push(req);
                return idx;
            }
        }
        case 'trick': {
            const id = req.name;
            if (id in index.trickBits) {
                return index.trickBits[id];
            } else {
                const idx = bump();
                index.trickBits[id] = idx;
                index.reverseIndex.push(req);
                return idx;
            }
        }
        case 'auxItem': {
            const id = req.name;
            if (id in index.auxItemBits) {
                return index.auxItemBits[id];
            } else {
                const idx = bump();
                index.auxItemBits[id] = idx;
                index.reverseIndex.push(req);
                return idx;
            }
        }
    }
}
