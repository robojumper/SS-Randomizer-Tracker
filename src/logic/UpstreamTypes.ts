import { OptionValue, OptionsCommand } from '../permalink/SettingsTypes';
import { InventoryItem } from './Inventory';

export enum TimeOfDay {
    DayOnly = 1,
    NightOnly = 2,
    Both = 3,
}

export interface RawArea {
    name: string;
    abstract: boolean;
    can_sleep: boolean;
    hint_region: string | null;
    allowed_time_of_day: TimeOfDay;
    entrances: string[] | undefined;
    exits: Record<string, string> | undefined;
    sub_areas: {
        [subAreaName: string]: RawArea;
    };
    locations: Record<string, string> | undefined;
}

export interface RawEntrance {
    type: 'entrance';
    'can-start-at': boolean | undefined;
    allowed_time_of_day: TimeOfDay;
    subtype: string | undefined;
    stage: string | undefined;
    province: string | undefined;
    short_name: string;
}

export interface RawExit {
    type: 'exit';
    allowed_time_of_day: TimeOfDay;
    vanilla: string | undefined;
    stage: string | undefined;
    short_name: string;
    'pillar-province': string | undefined;
}

export interface RawCheck {
    type: string | null;
    short_name: string;
    'original item': string;
}

export interface ExitLink {
    exit_from_outside: string | string[];
    exit_from_inside: string;
}

export interface CombinationQuery {
    type: 'combination';
    op: 'and' | 'or';
    args: SettingsQuery[];
}

export interface OptionQuery {
    type: 'query';
    option: OptionsCommand;
    op: 'eq' | 'in' | 'lt' | 'gt';
    negation: boolean;
    value: OptionValue;
}

export interface DungeonQuery {
    type: 'req_dungeon';
    dungeon: string;
    negation: boolean;
}

export type SettingsQuery = CombinationQuery | DungeonQuery | OptionQuery;

export type CounterExpression =
    | {
          type: 'mul';
          factor: number;
      }
    | {
          type: 'lookup';
          dict: Record<number, number>;
      };

export interface CounterAddend {
    item: InventoryItem;
    expression: CounterExpression;
}

export interface Counter {
    targets: CounterAddend[];
}

export interface RawLogic {
    items: string[];
    checks: Record<string, RawCheck>;
    /** LocationId -> Area - Location Name */
    gossip_stones: Record<string, string>;
    exits: Record<string, RawExit>;
    entrances: Record<string, RawEntrance>;
    areas: RawArea;
    linked_entrances: {
        silent_realms: {
            [realm: string]: ExitLink;
        };
        dungeons: {
            [dungeon: string]: ExitLink;
        };
    };
    dungeon_completion_requirements: {
        [dungeon: string]: string;
    };
    well_known_requirements?: {
        [key in
            | 'open_got'
            | 'raise_got'
            | 'horde_door'
            | 'impa_song_check'
            | 'complete_triforce']: string;
    };
    options?: Record<string, OptionQuery | DungeonQuery>;
    counters?: Record<string, Counter>;
}
