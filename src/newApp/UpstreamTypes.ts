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
    'can-start-at'?: boolean;
    allowed_time_of_day: TimeOfDay;
    subtype?: string;
    short_name: string;
}

export interface RawExit {
    type: 'exit';
    allowed_time_of_day: TimeOfDay;
    vanilla: string;
    short_name: string;
}

export interface RawCheck {
    type: string | null;
    short_name: string;
}

export interface RawLogic {
    items: string[];
    checks: Record<string, RawCheck>;
    /** LocationId -> Area - Location Name */
    gossip_stones: Record<string, string>;
    exits: Record<string, RawExit>,
    entrances: Record<string, RawEntrance>,
    areas: RawArea;
}