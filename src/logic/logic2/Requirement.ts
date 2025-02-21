import type { TypedOptions } from '../../permalink/SettingsTypes';
import type { InventoryItem } from '../Inventory';
import type { DungeonName } from '../Locations';
import type { TTimeOfDay } from '../Mappers';
import { runtimeOptions } from '../ThingsThatWouldBeNiceToHaveInTheDump';

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
      };

type PreInstanceRequirement2 =
    | {
          type: 'setting';
          name: string; // TODO structure?
      }
    | {
          type: 'wellKnown';
          name: string;
      };

/** Requirements after instantiating settings and required dungeons */
export type FullRequirement2 = RecursiveRequirement2<
    SimpleRequirement2 | PreInstanceRequirement2
>;

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
                return requirement;
            } else if (
                settings['enabled-tricks-bitless'].includes(requirement.name) ||
                settings['enabled-tricks-glitched'].includes(requirement.name)
            ) {
                return { type: 'and', terms: [] };
            } else {
                return { type: 'or', terms: [] };
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

            return match
                ? { type: 'and', terms: [] }
                : { type: 'or', terms: [] };
        }
        case 'wellKnown':
            // TODO
            return { type: 'and', terms: [] };
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
