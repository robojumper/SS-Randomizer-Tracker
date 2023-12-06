import { GeneratedOptions } from './GeneratedOptions';

export type BaseOption = {
    permalink: boolean | undefined;
    help: string;
    name: string;
    command: keyof TypedOptions;
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

export interface TypedOptions
    extends Omit<GeneratedOptions, 'rupeesanity' | 'shopsanity'> {
    rupeesanity: GeneratedOptions['rupeesanity'] | 'Vanilla';
    shopsanity: GeneratedOptions['shopsanity'] | 'Vanilla' | undefined;
    'beedle-shopsanity': boolean | undefined;
    'rupin-shopsanity': boolean | undefined;
    'luv-shopsanity': boolean | undefined;
}
