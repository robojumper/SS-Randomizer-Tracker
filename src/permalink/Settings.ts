import _ from 'lodash';
import PackedBitsWriter from './PackedBitsWriter';
import PackedBitsReader from './PackedBitsReader';
import { Option, OptionValue, OptionDefs, AllTypedOptions } from './SettingsTypes';

export function decodePermalink(
    optionDefs: OptionDefs,
    permalink: string,
): AllTypedOptions {
    const permaNoSeed = permalink.split('#')[0];
    const settings: Partial<Record<keyof AllTypedOptions, OptionValue>> = {};
    const reader = PackedBitsReader.fromBase64(permaNoSeed);
    _.forEach(optionDefs, (option) => {
        if (option.permalink !== false) {
            if (option.type === 'boolean') {
                settings[option.command] = reader.read(1) === 1;
            } else if (option.type === 'int') {
                settings[option.command] = reader.read(option.bits);
            } else if (option.type === 'multichoice') {
                const values: string[] = [];
                _.forEach(option.choices, (choice) => {
                    if (reader.read(1)) {
                        values.push(choice);
                    }
                });
                settings[option.command] = values;
            } else if (option.type === 'singlechoice') {
                settings[option.command] =
                    option.choices[reader.read(option.bits)];
            }
        }
    });
    return settings as AllTypedOptions;
}

export function defaultSettings(optionDefs: OptionDefs): AllTypedOptions {
    const settings: Partial<Record<keyof AllTypedOptions, OptionValue>> = {};
    _.forEach(optionDefs, (option) => {
        if (option.permalink !== false) {
            settings[option.command] = option.default;
        }
    });
    return settings as AllTypedOptions;
}

function validateValue(option: Option, value: unknown): OptionValue | undefined {
    switch (option.type) {
        case 'boolean':
            return typeof value === 'boolean' ? value : undefined;
        case 'singlechoice':
            return typeof value === 'string' && option.choices.includes(value) ? value : undefined;
        case 'multichoice': {
            const values = _.isArray(value)
                ? value.filter(
                    (choice) =>
                        typeof choice === 'string' &&
                        option.choices.includes(choice),
                )
                : [];
            return values.length ? values : undefined;
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

export function validateSettings(optionDefs: OptionDefs, userSettings: AllTypedOptions): AllTypedOptions {
    const settings: Partial<Record<keyof AllTypedOptions, OptionValue>> = {};
    for (const optionDef of optionDefs) {
        const key = optionDef.command;
        const value = userSettings[key];
        settings[key] = validateValue(optionDef, value) ?? optionDef.default;
    }

    return settings as AllTypedOptions;
}

export function encodePermalink(
    optionDefs: OptionDefs,
    settings: AllTypedOptions,
): string {
    const writer = new PackedBitsWriter();
    _.forEach(optionDefs, (option) => {
        if (option.permalink !== false) {
            if (option.type === 'boolean') {
                writer.write(settings[option.command] ? 1 : 0, 1);
            } else if (option.type === 'int') {
                writer.write(settings[option.command] as number, option.bits);
            } else if (option.type === 'multichoice') {
                const values = [...(settings[option.command] as string[])];
                _.forEach(option.choices, (choice) => {
                    writer.write(values.includes(choice) ? 1 : 0, 1);
                    // ensure the items are included the correct number of times
                    if (
                        values.includes(choice) &&
                        option.command === 'starting-items'
                    ) {
                        values.splice(values.indexOf(choice), 1);
                    }
                });
            } else if (option.type === 'singlechoice') {
                writer.write(
                    option.choices.indexOf(settings[option.command] as string),
                    option.bits,
                );
            }
        }
    });
    writer.flush();
    return writer.toBase64();
}
