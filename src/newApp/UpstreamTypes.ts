export enum TimeOfDay {
    DayOnly = 1,
    NightOnly = 2,
    Both = 3,
}

export interface RawArea {
    name: string;
    abstract: boolean;
    can_sleep: boolean;
    allowed_time_of_day: TimeOfDay;
    'hint-region': string | undefined;
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

export interface RawLogic {
    items: string[];
    checks: Record<string, string>;
    /** LocationId -> Area - Location Name */
    gossip_stones: Record<string, string>;
    exits: Record<string, RawExit>,
    entrances: Record<string, RawEntrance>,
    areas: RawArea;
}