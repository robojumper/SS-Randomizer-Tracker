import type { TypedOptions } from '../../permalink/SettingsTypes';
import type { RecursiveTooltipRequirement2 } from '../../tooltips/worker/BitIndex';
import type { InventoryItem } from '../Inventory';
import type { DungeonName } from '../Locations';
import { TimeOfDay, type TTimeOfDay } from '../Mappers';
import {
    runtimeOptions,
    swordsToAdd,
} from '../ThingsThatWouldBeNiceToHaveInTheDump';
import { dungeonCompletionItems, impaSongEvent } from '../TrackerModifications';

export type RecursiveRequirement3<R> =
    | { kind: 'op'; type: 'and'; terms: RecursiveRequirement3<R>[] }
    | { kind: 'op'; type: 'or'; terms: RecursiveRequirement3<R>[] }
    | ({ kind: 'leaf' } & R);

export type Requirement2 = RecursiveRequirement3<SimpleRequirement2>;

export type WellKnownRequirement = 'openGot' | 'raiseGot' | 'hordeDoor';

/** Basic requirements */
export type SimpleRequirement2 =
    | { type: 'item'; name: InventoryItem; count: number }
    | { type: 'event'; id: string }
    | {
          type: 'timeOfDay';
          tod: TTimeOfDay['DayOnly'] | TTimeOfDay['NightOnly'];
      }
    | { type: 'rupeeCapacity'; amount: number }
    | { type: 'gratitudeCrystals'; amount: number }
    | {
          /**
           * An auxiliary item that isn't really a proper inventory item,
           * such as a "goddess cube collected" or "dungeon completed" requirement.
           */
          type: 'auxItem';
          name: string;
      }
    | {
          type: 'trick';
          name: string;
          isCustomizationTrick: boolean;
      };

type PreInstanceRequirement2 =
    | {
          type: 'setting';
          name: string; // TODO structure?
      }
    | {
          type: 'wellKnown';
          name: WellKnownRequirement;
      };

export const Requirement = {
    and: <R>(terms: RecursiveRequirement3<R>[]): RecursiveRequirement3<R> => {
        return { kind: 'op', type: 'and', terms };
    },

    or: <R>(terms: RecursiveRequirement3<R>[]): RecursiveRequirement3<R> => {
        return { kind: 'op', type: 'or', terms };
    },

    true: <R>(): RecursiveRequirement3<R> => {
        return Requirement.and([]);
    },

    false: <R>(): RecursiveRequirement3<R> => {
        return Requirement.or([]);
    },

    auxItem: (name: string) => {
        return { kind: 'leaf', type: 'auxItem', name } as const;
    },

    day: () => {
        return {
            kind: 'leaf',
            type: 'timeOfDay',
            tod: TimeOfDay.DayOnly,
        } as const;
    },

    night: () => {
        return {
            kind: 'leaf',
            type: 'timeOfDay',
            tod: TimeOfDay.NightOnly,
        } as const;
    },

    walletCapacity: (amount: number) => {
        return { kind: 'leaf', type: 'rupeeCapacity', amount } as const;
    },

    gratitudeCrystals: (amount: number) => {
        return { kind: 'leaf', type: 'gratitudeCrystals', amount } as const;
    },

    event: (id: string) => {
        return { kind: 'leaf', type: 'event', id } as const;
    },

    trick: (name: string) => {
        return {
            kind: 'leaf',
            type: 'trick',
            name,
            isCustomizationTrick: false,
        } as const;
    },

    setting: (name: string) => {
        return { kind: 'leaf', type: 'setting', name } as const;
    },

    item: (name: InventoryItem, count: number) => {
        return { kind: 'leaf', type: 'item', name, count } as const;
    },

    wellKnown: (name: WellKnownRequirement) => {
        return { kind: 'leaf', type: 'wellKnown', name } as const;
    },
};

/** Requirements after instantiating settings and required dungeons */
export type FullRequirement2 = RecursiveRequirement3<
    SimpleRequirement2 | PreInstanceRequirement2
>;

function instantiateWellKnownRequirement(
    requirement: FullRequirement2 & { type: 'wellKnown' },
    settings: TypedOptions,
    requiredDungeons: DungeonName[],
): Requirement2 {
    const requiredDungeonsReq = (): Requirement2 => {
        const terms = requiredDungeons
            .filter((d) => d !== 'Sky Keep')
            .map((d) => Requirement.auxItem(dungeonCompletionItems[d]));
        return Requirement.and(terms);
    };
    switch (requirement.name) {
        case 'raiseGot':
            if (settings['got-start'] === 'Raised') {
                return Requirement.true();
            } else {
                return Requirement.event(impaSongEvent);
            }
        case 'openGot': {
            const neededSwords = swordsToAdd[settings['got-sword-requirement']];
            const expr = Requirement.item('Progressive Sword', neededSwords);
            if (settings['got-dungeon-requirement'] === 'Required') {
                return Requirement.and([expr, requiredDungeonsReq()]);
            } else {
                return expr;
            }
        }
        case 'hordeDoor': {
            const expr: Requirement2 = settings['triforce-required']
                ? Requirement.item('Triforce', 3)
                : Requirement.true();
            if (settings['got-dungeon-requirement'] === 'Unrequired') {
                return Requirement.and([expr, requiredDungeonsReq()]);
            } else {
                return expr;
            }
        }
    }
}

function instantiateRequirement(
    requirement: FullRequirement2,
    settings: TypedOptions,
    consideredTricks: Set<string>,
    requiredDungeons: DungeonName[],
): Requirement2 {
    switch (requirement.kind) {
        case 'op':
            return {
                kind: 'op',
                type: requirement.type,
                terms: requirement.terms.map((t) =>
                    instantiateRequirement(
                        t,
                        settings,
                        consideredTricks,
                        requiredDungeons,
                    ),
                ),
            };
        case 'leaf': {
            switch (requirement.type) {
                case 'item':
                case 'event':
                case 'timeOfDay':
                case 'rupeeCapacity':
                case 'gratitudeCrystals':
                case 'auxItem':
                    return requirement;
                case 'trick':
                    if (consideredTricks.has(requirement.name)) {
                        return { ...requirement, isCustomizationTrick: true };
                    } else if (
                        settings['enabled-tricks-bitless'].includes(
                            requirement.name,
                        ) ||
                        settings['enabled-tricks-glitched'].includes(
                            requirement.name,
                        )
                    ) {
                        return requirement;
                    } else {
                        return Requirement.false();
                    }
                case 'setting': {
                    const checker = runtimeOptions.find(
                        (o) => o[0] === requirement.name,
                    )!;
                    const [, command, expect] = checker;
                    const val = settings[command];
                    const match =
                        val !== undefined &&
                        (typeof expect === 'function'
                            ? expect(val)
                            : expect === val);

                    return match ? Requirement.true() : Requirement.false();
                }
                case 'wellKnown':
                    return instantiateWellKnownRequirement(
                        requirement,
                        settings,
                        requiredDungeons,
                    );
            }
        }
    }
}

export function instantiateRequirements(
    requirements: FullRequirement2[],
    settings: TypedOptions,
    consideredTricks: Set<string>,
    requiredDungeons: DungeonName[],
): Requirement2[] {
    return requirements.map((r) =>
        instantiateRequirement(r, settings, consideredTricks, requiredDungeons),
    );
}

export function simplifyRequirement(
    req: RecursiveTooltipRequirement2,
): RecursiveTooltipRequirement2 {
    switch (req.kind) {
        case 'op': {
            const newItems = req.terms.flatMap((item) => {
                if (item.type !== 'and' && item.type !== 'or') {
                    return item;
                }
                const flatItem = simplifyRequirement(item);
                if (
                    flatItem.kind === 'op' &&
                    (flatItem.type === req.type || flatItem.terms.length === 1)
                ) {
                    return flatItem.terms;
                }
                return flatItem;
            });

            if (newItems.length === 1 && newItems[0].kind === 'op') {
                return newItems[0];
            }

            return {
                kind: 'op',
                type: req.type,
                terms: newItems,
            };
        }
    }
    return req;
}
