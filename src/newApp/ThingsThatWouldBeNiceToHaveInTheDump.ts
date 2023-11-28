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
    '\\FaronLake Floria\\Waterfall\\Exit to Ancient Cistern',
    '\\Lanayru\\Lanayru Sand Sea\\Ancient Harbour\\Exit to Sandship',
    '\\Lanayru\\Lanayru Sand Sea\\Sandship Dock Exit',
    '\\Eldin\\Volcano Summit\\Outside Fire Sanctuary\\Exit to Fire Sanctuary',
    '\\Skyloft\\Central Skyloft\\Near Temple Entrance\\Exit to Sky Keep',
];

export const nonRandomizedExits = [
    '\\Faron\\Sealed Grounds\\Sealed Temple\\Gate of Time Exit',
    '\\Faron\\Sealed Grounds\\Hylia\'s Temple\\Gate of Time Exit'
];

// Check type for loose crystals, rupeesanity checks, ...