export type BaseOption = {
    permalink: boolean | undefined;
    help: string;
    name: keyof TypedOptions;
};

export type BooleanOption = BaseOption & {
    type: 'boolean';
    default: boolean;
};

export type SingleChoiceOption = BaseOption & {
    type: 'singlechoice';
    choices: string[];
    bits: number;
    default: string;
};

export type MultiChoiceOption = BaseOption & {
    type: 'multichoice';
    choices: string[];
    default: string[];
};

export type IntOption = BaseOption & {
    type: 'int';
    min: number;
    max: number;
    bits: number;
    default: number;
};

export type Option =
    | BooleanOption
    | SingleChoiceOption
    | MultiChoiceOption
    | IntOption;

export type OptionDefs = Option[];

export type OptionValue = string | string[] | number | boolean;
export type OptionType = Option['type'];

export type TypedOptions = {
    'Logic Mode': 'BiTless' | 'Glitched';

    Rupeesanity: boolean | string;
    Tadtonesanity: boolean;
    'Randomize Entrances': 'None' | 'Required Dungeons Separately' | 'All Surface Dungeons' | 'All Surface Dungeons + Sky Keep';
    'Starting Sword': string;
    'Open Thunderhead': string;
    'Open Earth Temple': boolean;
    'Open Lanayru Mining Facility': string;
    'Upgraded Skyward Strike': boolean;
    'Empty Unrequired Dungeons': boolean;
    'Triforce Required': boolean;
    'Triforce Shuffle': string;

    'Starting Tablet Count': number;
    'Starting Gratitude Crystal Packs': number;
    'Starting Tadtone Count': number;
    'Starting Empty Bottles': number;
    'Starting Items': string[];

    'Randomize Silent Realms': boolean
    'Treasuresanity in Silent Realms': boolean;
    'Trial Treasure Amount': number;


    'Excluded Locations': string[];
    'Enabled Tricks': string[];
    'Enabled Tricks BiTless': string[];
    'Enabled Tricks Glitched': string[];

    'Gate of Time Sword Requirement': string;

    // deprecated
    'Shop Mode': string;
    'Max Batreaux Reward': number;

    // https://github.com/ssrando/ssrando/pull/442
    // to be deprecated
    Shopsanity: boolean;
    // future
    'Beedle Shopsanity': boolean;
    'Gear Shopsanity': boolean;
    'Potion Shopsanity': boolean;
};