export const TimeOfDay = {
    DayOnly: 1,
    NightOnly: 2,
    Both: 3,
} as const;
export type TTimeOfDay = typeof TimeOfDay;
