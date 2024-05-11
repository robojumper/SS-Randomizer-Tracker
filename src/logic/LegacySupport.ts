/**
 * Sometimes the rando adds things to the dump that were
 * previously hardcoded in the tracker. This file contains
 * that data so that we can essentially migrate older but still
 * supported releases to the new format and reduce the number
 * of special cases we have to handle in core tracker code.
 */

import { MultiChoiceOption, OptionDefs, TypedOptions } from '../permalink/SettingsTypes';
import { dungeonNames } from './Locations';
import { OptionQuery, RawLogic } from './UpstreamTypes';

const m = <K extends keyof TypedOptions>(
    option: K,
    op: OptionQuery['op'],
    value: Exclude<TypedOptions[K], undefined>,
    negation = false,
): OptionQuery => {
    return {
        type: 'query',
        op,
        option,
        value,
        negation,
    };
};

const legacyHardcodedOptions: RawLogic['options'] = {
    'Open Thunderhead option': m('open-thunderhead', 'eq', 'Open'),
    'Open ET option': m('open-et', 'eq', true),
    'Open LMF option': m('open-lmf', 'eq', 'Open'),
    'LMF Nodes On option': m('open-lmf', 'eq', 'Main Node'),
    'Open Lake Floria option': m('open-lake-floria', 'eq', 'Open'),
    'Talk to Yerbal option': m('open-lake-floria', 'eq', 'Talk to Yerbal'),
    'Vanilla Lake Floria option': m('open-lake-floria', 'eq', 'Vanilla'),
    'Randomized Beedle option': m(
        'shopsanity',
        'eq',
        'Vanilla',
        /* negation */ true,
    ),
    'Gondo Upgrades On option': m('gondo-upgrades', 'eq', false),
    'No BiT crashes': m('bit-patches', 'eq', 'Fix BiT Crashes'),
    'Nonlethal Hot Cave': m('damage-multiplier', 'lt', 12),
    'Upgraded Skyward Strike option': m('upgraded-skyward-strike', 'eq', true),
    'FS Lava Flow option': m('fs-lava-flow', 'eq', true),
};

/**
 * Get Query conditions (settings value or required dungeon tests, tricks)
 */
export function getOptionConditions(options: OptionDefs) {
    const conditions = {...legacyHardcodedOptions};
    const enabledTricksOption = options.find((v) => v.command === 'enabled-tricks-bitless');
    const enabledTricksGlitchedOption = options.find((v) => v.command === 'enabled-tricks-glitched');

    const handleTricks = (option: MultiChoiceOption) => {
        for (const choice of option.choices) {
            conditions[`${choice} Trick`] = {
                type: 'query',
                option: option.command,
                op: 'in',
                value: choice,
                negation: false,
            };
        }
    };

    // https://github.com/NindyBK/ssrnppbuild/pull/1
    if (options.some((o) => o.command === 'open-shortcuts')) {
        conditions['Open Dungeon Shortcuts option'] = m('open-shortcuts', 'eq',  'All Dungeons');
        conditions['Open Unrequired Shortcuts option'] = m('open-shortcuts', 'eq',  'Unrequired Dungeons Only');
        conditions['Default Dungeon Behavior option'] = m('open-shortcuts', 'eq',  'None');

        for (const dungeon of dungeonNames) {
            conditions[`${dungeon} Required`] = { type: 'req_dungeon', dungeon, negation: false };
            conditions[`${dungeon} Unrequired`] = { type: 'req_dungeon', dungeon, negation: true };
        }
    }

    if (enabledTricksOption?.type === 'multichoice') {
        handleTricks(enabledTricksOption);
    }
    if (enabledTricksGlitchedOption?.type === 'multichoice') {
        handleTricks(enabledTricksGlitchedOption);
    }

    return conditions;
}