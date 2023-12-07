import { StylesConfig } from 'react-select';

export function selectStyles<IsMulti extends boolean, Option>(): StylesConfig<Option, IsMulti> {
    return ({
        control: (baseStyles) => ({
            ...baseStyles,
            color: 'var(--scheme-text)',
            backgroundColor: 'var(--scheme-background)',
        }),
        menu: (baseStyles) => ({
            ...baseStyles,
            backgroundColor: 'var(--scheme-background)',
        }),
        option: (baseStyles, state) => ({
            ...baseStyles,
            color: state.isFocused
                ? 'var(--scheme-text)'
                : 'var(--scheme-background)',
            backgroundColor: state.isFocused
                ? 'var(--scheme-background)'
                : 'var(--scheme-text)',
        }),
    });
}
