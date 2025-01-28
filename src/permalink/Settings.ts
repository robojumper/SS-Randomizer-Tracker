import {
    nonRandomizedSettings,
    type NeverRandomizedSetting,
} from '../logic/ThingsThatWouldBeNiceToHaveInTheDump';
import PackedBitsReader from './PackedBitsReader';
import PackedBitsWriter from './PackedBitsWriter';
import type {
    AllTypedOptions,
    Option,
    OptionDefs,
    OptionsCommand,
    OptionValue,
    TypedOptions,
} from './SettingsTypes';

/** The tracker will only show these options, and tracker logic code is only allowed to access these! */
const optionCategorization_ = {
    Shuffles: [
        'rupeesanity',
        'shopsanity',
        'beedle-shopsanity',
        'luv-shopsanity',
        'rupin-shopsanity',
        'gondo-upgrades',
        'tadtonesanity',
        'treasuresanity-in-silent-realms',
        'trial-treasure-amount',
        'small-key-mode',
        'boss-key-mode',
        'empty-unrequired-dungeons',
    ],
    'Starting Items': [
        'starting-sword',
        'upgraded-skyward-strike',
        'starting-tablet-count',
        'starting-bottles',
        'starting-crystal-packs',
        'starting-tadtones',
        'starting-items',
    ],
    Entrances: [
        'random-start-entrance',
        'random-start-statues',
        'randomize-entrances',
        'randomize-dungeon-entrances',
        'randomize-trials',
        'random-puzzles',
    ],
    Convenience: [
        'open-lake-floria',
        'open-et',
        'open-lmf',
        'open-thunderhead',
        'fs-lava-flow',
        'open-shortcuts',
    ],
    Victory: [
        'got-start',
        'got-sword-requirement',
        'got-dungeon-requirement',
        'required-dungeon-count',
        'triforce-required',
        'triforce-shuffle',
    ],
    Miscellaneous: [
        'random-settings',
        'logic-mode',
        'bit-patches',
        'damage-multiplier',
        'enabled-tricks-bitless',
        'enabled-tricks-glitched',
        'excluded-locations',
        'hint-distribution',
    ],
} as const satisfies Record<string, readonly OptionsCommand[]>;

export type LogicOption =
    (typeof optionCategorization_)[keyof typeof optionCategorization_][number];
export const optionCategorization: Record<string, readonly LogicOption[]> =
    optionCategorization_;

export function isTrackerUserRelevantSetting(
    option: OptionsCommand,
): option is LogicOption {
    return Object.values(optionCategorization).some(
        (arr: readonly OptionsCommand[]) => arr.includes(option),
    );
}

const hypotheticalMostRandomizedSetting: Omit<
    TypedOptions,
    NeverRandomizedSetting
> = {
    rupeesanity: true,
    shopsanity: true,
    'randomize-entrances': 'All',
    'starting-tablet-count': 0,
    'open-thunderhead': 'Ballad',
    'starting-sword': 'Swordless',
    'required-dungeon-count': 6,
    'empty-unrequired-dungeons': false,
    'triforce-required': true,
    'triforce-shuffle': 'Anywhere',
    'randomize-trials': true,
    'gondo-upgrades': true,
    'got-sword-requirement': 'True Master Sword',
    'open-lmf': 'Nodes',
    'small-key-mode': 'Anywhere',
    'boss-key-mode': 'Anywhere',
    'open-et': false,
    'open-lake-floria': 'Vanilla',
    'upgraded-skyward-strike': false,
    'damage-multiplier': 100,
    'hint-distribution': 'Weak',
    'starting-items': [],
    'starting-crystal-packs': 0,
    'starting-bottles': 0,
    tadtonesanity: true,
    'starting-tadtones': 0,
    'fs-lava-flow': false,
    'random-start-entrance': 'Any',
    'treasuresanity-in-silent-realms': true,
    'trial-treasure-amount': 10,
    'random-start-statues': true,
    'random-puzzles': true,
    'beedle-shopsanity': true,
    'rupin-shopsanity': true,
    'luv-shopsanity': true,
    'randomize-dungeon-entrances': 'All Surface Dungeons + Sky Keep',
    'open-shortcuts': 'None',
};

export function decodePermalink(
    optionDefs: OptionDefs,
    permalink: string,
): AllTypedOptions {
    const permaNoSeed = permalink.split('#')[0];
    const settings: Partial<Record<OptionsCommand, OptionValue>> = {};
    const reader = PackedBitsReader.fromBase64(permaNoSeed);
    for (const option of optionDefs) {
        if (option.permalink !== false) {
            if (option.type === 'boolean') {
                settings[option.command] = reader.read(1) === 1;
            } else if (option.type === 'int') {
                settings[option.command] = reader.read(option.bits);
            } else if (option.type === 'multichoice') {
                const values: string[] = [];
                for (const choice of option.choices) {
                    if (reader.read(1)) {
                        values.push(choice);
                    }
                }
                settings[option.command] = values;
            } else if (option.type === 'singlechoice') {
                settings[option.command] =
                    option.choices[reader.read(option.bits)];
            }
        }
    }
    return settings as AllTypedOptions;
}

export function defaultSettings(optionDefs: OptionDefs): AllTypedOptions {
    const settings: Partial<Record<OptionsCommand, OptionValue>> = {};
    for (const option of optionDefs) {
        if (option.permalink !== false) {
            settings[option.command] = option.default;
        }
    }
    return settings as AllTypedOptions;
}

export function mapToAssumedSettings(
    options: OptionDefs,
    initialSettings: AllTypedOptions,
    settingsOverrides: Partial<AllTypedOptions>,
): AllTypedOptions {
    if (!initialSettings['random-settings']) {
        return initialSettings;
    }
    const ret = { ...initialSettings } as Record<OptionsCommand, OptionValue>;
    for (const option of options) {
        if (
            option.permalink === false ||
            nonRandomizedSettings.includes(option.command)
        ) {
            continue;
        }
        const origValue = settingsOverrides[option.command];
        const validatedValue =
            origValue !== undefined
                ? validateValue(option, origValue)
                : undefined;
        if (validatedValue !== undefined) {
            ret[option.command] = validatedValue;
        } else {
            let value =
                hypotheticalMostRandomizedSetting[
                    option.command as keyof typeof hypotheticalMostRandomizedSetting
                ];
            if (
                option.command === 'randomize-entrances' &&
                !options.some(
                    (o) => o.command === 'randomize-dungeon-entrances',
                )
            ) {
                // If this dump doesn't know about "Full ER", we don't want to turn
                // the regular dungeon entrance randomizer into a full-blown ER.
                // This annoying workaround is necessary because the Full ER preview
                // repurposes the existing 'randomize-entrances' setting.
                value =
                    hypotheticalMostRandomizedSetting[
                        'randomize-dungeon-entrances'
                    ];
            }
            if (value !== undefined) {
                ret[option.command] = value;
            }
        }
    }

    return ret as AllTypedOptions;
}

function validateValue(
    option: Option,
    value: unknown,
): OptionValue | undefined {
    switch (option.type) {
        case 'boolean':
            return typeof value === 'boolean' ? value : undefined;
        case 'singlechoice':
            return typeof value === 'string' && option.choices.includes(value)
                ? value
                : undefined;
        case 'multichoice': {
            return Array.isArray(value) ? value : undefined;
        }
        case 'int':
            return typeof value === 'number' &&
                Number.isInteger(value) &&
                value >= option.min &&
                value <= option.max
                ? value
                : undefined;
    }
}

export function validateSettingsOverrides(
    optionDefs: OptionDefs,
    initialSettings: Partial<AllTypedOptions>,
): Partial<AllTypedOptions> {
    const settings: Partial<Record<OptionsCommand, OptionValue>> = {};
    for (const optionDef of optionDefs) {
        if (optionDef.permalink === false) {
            continue;
        }
        const key = optionDef.command;
        const value = initialSettings[key];
        settings[key] = validateValue(optionDef, value);
    }

    return settings as Partial<AllTypedOptions>;
}

export function validateSettings(
    optionDefs: OptionDefs,
    initialSettings: Partial<AllTypedOptions>,
): AllTypedOptions {
    const settings: Partial<Record<OptionsCommand, OptionValue>> = {};
    for (const optionDef of optionDefs) {
        if (optionDef.permalink === false) {
            continue;
        }
        const key = optionDef.command;
        const value = initialSettings[key];
        settings[key] = validateValue(optionDef, value) ?? optionDef.default;
    }

    return settings as AllTypedOptions;
}

export function encodePermalink(
    optionDefs: OptionDefs,
    settings: AllTypedOptions,
): string {
    const writer = new PackedBitsWriter();
    for (const option of optionDefs) {
        if (option.permalink !== false) {
            if (option.type === 'boolean') {
                writer.write(settings[option.command] ? 1 : 0, 1);
            } else if (option.type === 'int') {
                writer.write(settings[option.command] as number, option.bits);
            } else if (option.type === 'multichoice') {
                const values = [...(settings[option.command] as string[])];
                for (const choice of option.choices) {
                    writer.write(values.includes(choice) ? 1 : 0, 1);
                    // ensure the items are included the correct number of times
                    if (
                        values.includes(choice) &&
                        option.command === 'starting-items'
                    ) {
                        values.splice(values.indexOf(choice), 1);
                    }
                }
            } else if (option.type === 'singlechoice') {
                writer.write(
                    option.choices.indexOf(settings[option.command] as string),
                    option.bits,
                );
            }
        }
    }
    writer.flush();
    return writer.toBase64();
}
