import { OptionType, OptionValue, TypedOptions } from "../permalink/SettingsTypes";
import { RegularDungeon } from "./DerivedState";

export const dungeonCompletionRequirements: Record<RegularDungeon, string> = {
    Skyview: '\\Skyview\\Spring\\Strike Crest',
    'Earth Temple': '\\Earth Temple\\Spring\\Strike Crest',
    'Lanayru Mining Facility':
        '\\Lanayru Mining Facility\\Hall of Ancient Robots\\End\\Exit Hall of Ancient Robots',
    'Ancient Cistern': "\\Ancient Cistern\\Flame Room\\Farore's Flame",
    Sandship: "\\Sandship\\Boss Room\\Nayru's Flame",
    'Fire Sanctuary': "\\Fire Sanctuary\\Flame Room\\Din's Flame",
};

export const randomizedExitsToDungeons = [
    '\\Faron\\Faron Woods\\Deep Woods\\Exit to Skyview Temple',
    '\\Eldin\\Volcano\\Near Temple Entrance\\Exit to Earth Temple',
    '\\Lanayru\\Desert\\Top of LMF\\Exit to Lanayru Mining Facility',
    '\\Faron\\Lake Floria\\Waterfall\\Exit to Ancient Cistern',
    '\\Lanayru\\Lanayru Sand Sea\\Ancient Harbour\\Exit to Sandship',
    '\\Lanayru\\Lanayru Sand Sea\\Sandship Dock Exit',
    '\\Eldin\\Volcano Summit\\Outside Fire Sanctuary\\Exit to Fire Sanctuary',
    '\\Skyloft\\Central Skyloft\\Near Temple Entrance\\Exit to Sky Keep',
];

export const randomizedDungeonEntrances = [
    '\\Skyview\\Main\\Entry\\Main Entrance',
    '\\Earth Temple\\Main\\First Room\\Main Entrance',
    '\\Lanayru Mining Facility\\Main\\First Room\\Main Entrance',
    '\\Ancient Cistern\\Main\\Main Room\\Main Entrance',
    '\\Sandship\\Main\\Deck\\Main Entrance',
    '\\Fire Sanctuary\\Main\\First Room\\Main Entrance',
    '\\Sky Keep\\Main\\First Room\\Bottom Entrance',
]

export const nonRandomizedExits = [
    '\\Faron\\Sealed Grounds\\Sealed Temple\\Gate of Time Exit',
    '\\Faron\\Sealed Grounds\\Hylia\'s Temple\\Gate of Time Exit'
];

type OptionMapping = [string, keyof TypedOptions, OptionValue | ((val: OptionValue) => boolean)];
const m = <K extends keyof TypedOptions>(item: string, settingsKey: K, value: TypedOptions[K] | ((value: TypedOptions[K]) => boolean)): OptionMapping => [item, settingsKey, value as OptionType];

export const runtimeOptions: OptionMapping[] = [
    m('Open Thunderhead option', 'open-thunderhead', 'Open'),
    m('Open ET option', 'open-et', true),
    m('Open LMF option', 'open-lmf', "Open"),
    m('LMF Nodes on option', 'open-lmf', "Main Node"),
    m('Floria Gates option', 'open-lake-floria', 'Open'),
    m('Talk to Yerbal option', 'open-lake-floria', 'Talk to Yerbal'),
    m('Vanilla Lake Floria option', 'open-lake-floria', 'Vanilla'),
    m('Randomized Beedle option', 'shopsanity', (val) => val !== 'Vanilla'),
    m('Gondo Upgrades On option', 'gondo-upgrades', true),
    m('No BiT crashes', 'bit-patches', 'Fix BiT Crashes'),
    m('Nonlethal Hot Cave', 'damage-multiplier', (val) => val < 12),
    m('Upgraded Skyward Strike option', 'upgraded-skyward-strike', true),
    m('FS Lava Flow option', 'fs-lava-flow', true),
];

export const impaSongCheck = '\\Faron\\Sealed Grounds\\Sealed Temple\\Song from Impa';
export const completeTriforceReq = '\\Complete Triforce';

export const swordsToAdd: Record<string, number> = {
    Swordless: 0,
    'Practice Sword': 1,
    'Goddess Sword': 2,
    'Goddess Longsword': 3,
    'Goddess White Sword': 4,
    'Master Sword': 5,
    'True Master Sword': 6,
};

// These requirements are populated based on required dungeons

export const gotOpeningReq = 'GoT Opening Requirement';
export const gotRaisingReq = 'GoT Raising Requirement';
export const hordeDoorReq = 'Horde Door Requirement';
