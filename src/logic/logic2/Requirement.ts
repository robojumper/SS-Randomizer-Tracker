import type { TypedOptions } from '../../permalink/SettingsTypes';
import type { RecursiveTooltipRequirement2 } from '../../tooltips/worker/BitIndex';
import type { InventoryItem } from '../Inventory';
import type { DungeonName } from '../Locations';
import type { TTimeOfDay } from '../Mappers';
import {
    runtimeOptions,
    swordsToAdd,
} from '../ThingsThatWouldBeNiceToHaveInTheDump';
import { dungeonCompletionItems, impaSongEvent } from '../TrackerModifications';

export type RecursiveRequirement2<R> =
    | { type: 'and'; terms: RecursiveRequirement2<R>[] }
    | { type: 'or'; terms: RecursiveRequirement2<R>[] }
    | R;

export type Requirement2 = RecursiveRequirement2<SimpleRequirement2>;

/** Basic requirements as they appear in the logic dump */
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
          name: 'openGot' | 'raiseGot' | 'hordeDoor';
      };

export function trueRequirement<R>(): RecursiveRequirement2<R> {
    return { type: 'and', terms: [] };
}

export function falseRequirement<R>(): RecursiveRequirement2<R> {
    return { type: 'or', terms: [] };
}

/** Requirements after instantiating settings and required dungeons */
export type FullRequirement2 = RecursiveRequirement2<
    SimpleRequirement2 | PreInstanceRequirement2
>;

function instantiateWellKnownRequirement(
    requirement: FullRequirement2 & { type: 'wellKnown' },
    settings: TypedOptions,
    requiredDungeons: DungeonName[],
): Requirement2 {
    const requiredDungeonsReq = (): Requirement2 => {
        const dungeonsReq: Requirement2 = { type: 'and', terms: [] };
        for (const dungeon of requiredDungeons) {
            if (dungeon !== 'Sky Keep') {
                dungeonsReq.terms.push({
                    type: 'auxItem',
                    name: dungeonCompletionItems[dungeon],
                });
            }
        }
        return dungeonsReq;
    };
    switch (requirement.name) {
        case 'raiseGot':
            if (settings['got-start'] === 'Raised') {
                return trueRequirement();
            } else {
                return { type: 'event', id: impaSongEvent };
            }
        case 'openGot': {
            const neededSwords = swordsToAdd[settings['got-sword-requirement']];
            const expr: Requirement2 = {
                type: 'item',
                name: 'Progressive Sword',
                count: neededSwords,
            };
            if (settings['got-dungeon-requirement'] === 'Required') {
                return { type: 'and', terms: [expr, requiredDungeonsReq()] };
            } else {
                return expr;
            }
        }
        case 'hordeDoor': {
            const expr: Requirement2 = settings['triforce-required']
                ? { type: 'item', name: 'Triforce', count: 3 }
                : trueRequirement();
            if (settings['got-dungeon-requirement'] === 'Unrequired') {
                return { type: 'and', terms: [expr, requiredDungeonsReq()] };
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
    switch (requirement.type) {
        case 'and':
        case 'or':
            return {
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
                settings['enabled-tricks-bitless'].includes(requirement.name) ||
                settings['enabled-tricks-glitched'].includes(requirement.name)
            ) {
                return requirement;
            } else {
                return falseRequirement();
            }
        case 'setting': {
            const checker = runtimeOptions.find(
                (o) => o[0] === requirement.name,
            )!;
            const [, command, expect] = checker;
            const val = settings[command];
            const match =
                val !== undefined &&
                (typeof expect === 'function' ? expect(val) : expect === val);

            return match ? trueRequirement() : falseRequirement();
        }
        case 'wellKnown':
            return instantiateWellKnownRequirement(
                requirement,
                settings,
                requiredDungeons,
            );
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
    if ('type' in req) {
        switch (req.type) {
            case 'or':
            case 'and': {
                const newItems = req.terms.flatMap((item) => {
                    if (item.type !== 'and' && item.type !== 'or') {
                        return item;
                    }
                    const flatItem = simplifyRequirement(item);
                    if (
                        (flatItem.type === 'and' || flatItem.type === 'or') &&
                        (flatItem.type === req.type ||
                            flatItem.terms.length === 1)
                    ) {
                        return flatItem.terms;
                    }
                    return flatItem;
                });

                if (
                    newItems.length === 1 &&
                    (newItems[0].type === 'and' || newItems[0].type === 'or')
                ) {
                    return newItems[0];
                }

                return {
                    type: req.type,
                    terms: newItems,
                };
            }
        }
    }
    return req;
}
