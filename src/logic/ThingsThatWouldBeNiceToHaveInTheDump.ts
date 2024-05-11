/** Exits that are not randomized even if ER is on. */
export const nonRandomizedExits = [
    '\\Faron\\Sealed Grounds\\Sealed Temple\\Gate of Time Exit',
    "\\Faron\\Sealed Grounds\\Hylia's Temple\\Gate of Time Exit",
];

/** Entrances that are not available for randomization even if ER is on. */
export const nonRandomizedEntrances = [
    '\\Faron\\Sealed Grounds\\Sealed Temple\\Gate of Time Exit',
    "\\Faron\\Sealed Grounds\\Hylia's Temple\\Gate of Time Entrance",
];

/** Exits and entrances that are neutered and don't do anything. */
export const bannedExitsAndEntrances = [
    '\\Lanayru\\Temple of Time\\Inside\\Exit to Lanayru Mining Facility',
    '\\Lanayru\\Temple of Time\\Inside\\Entrance from Lanayru Mining Facility',
    '\\Lanayru Mining Facility\\Hall of Ancient Robots\\End\\Entrance from Temple of Time',
];

/** The exit that leads from LMF to the temple of time. */
export const lmfSecondExit = '\\Lanayru Mining Facility\\Hall of Ancient Robots\\End\\Exit to Temple of Time';

export const impaSongCheck =
    '\\Faron\\Sealed Grounds\\Sealed Temple\\Song from Impa';
export const completeTriforceReq = '\\Complete Triforce';

export const swordsToAdd = {
    Swordless: 0,
    'Practice Sword': 1,
    'Goddess Sword': 2,
    'Goddess Longsword': 3,
    'Goddess White Sword': 4,
    'Master Sword': 5,
    'True Master Sword': 6,
};

export const knownNoGossipStoneHintDistros = [
    '2D Dowsing & Fi Hints',
    'Boss Keysanity Fi Hints',
    'Dowsing & Fi Hints',
    'Remlits Tournament',
    'Strong Dowsing All Dungeons',
];

// These requirements are populated based on required dungeons

export const gotOpeningReq = 'GoT Opening Requirement';
export const gotRaisingReq = 'GoT Raising Requirement';
export const hordeDoorReq = 'Horde Door Requirement';
