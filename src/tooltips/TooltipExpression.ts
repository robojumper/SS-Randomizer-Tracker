import { Logic } from '../logic/Logic';
import BooleanExpression, { Op, ReducerArg } from '../newApp/BooleanExpression';
import { LogicalState } from '../newApp/DerivedState';
import prettyItemNames_ from '../data/prettyItemNames.json';
import _ from 'lodash';
import { BitVector } from '../bitlogic/BitVector';

const prettyItemNames: Record<
    string,
    Record<number, string>
> = prettyItemNames_;

export interface TerminalRequirement {
    type: 'item';
    item: string;
    logicalState: LogicalState;
}

export interface NonterminalRequirement {
    type: 'expr';
    items: TooltipExpression[];
    op: Op;
}

export type TooltipExpression = TerminalRequirement | NonterminalRequirement;

export interface RootTooltipExpression {
    op: Op.And,
    items: TooltipExpression[],
}

const impossible: RootTooltipExpression = {
    op: Op.And,
    items: [
        {
            type: 'item',
            item: 'Impossible (discover an entrance first)',
            logicalState: 'outLogic',
        }
    ]
};

const nothing: RootTooltipExpression = {
    op: Op.And,
    items: [
        {
            type: 'item',
            item: 'Nothing',
            logicalState: 'inLogic',
        }
    ]
};

export function booleanExprToTooltipExpr(logic: Logic, expr: BooleanExpression, logicBits: BitVector, semiLogicBits: BitVector): RootTooltipExpression {
    const reducer = (arg: ReducerArg<NonterminalRequirement>) => {
        if (arg.isReduced) {
            return {
                ...arg.accumulator,
                items: [...arg.accumulator.items, arg.item]
            }
        } else {
            const bit = logic.items[arg.item][1];
            const wrappedItem: TerminalRequirement = {
                type: 'item',
                item: getReadableItemName(logic, arg.item),
                logicalState: logicBits.test(bit) ? 'inLogic' : semiLogicBits.test(bit) ? 'semiLogic' : 'outLogic',
            };
            return {
                ...arg.accumulator,
                items: [...arg.accumulator.items, wrappedItem],
            }
        }
    };

    const ntExpr = expr.reduce<NonterminalRequirement>(({
        andInitialValue: {
            type: 'expr',
            items: [],
            op: Op.And,
        },
        orInitialValue: {
            type: 'expr',
            items: [],
            op: Op.Or,
        },
        andReducer: reducer,
        orReducer: reducer,
    }));

    if (!ntExpr.items.length) {
        return ntExpr.op === Op.And ? nothing : impossible;
    }

    if (ntExpr.op === Op.And) {
        return {
            items: ntExpr.items,
            op: ntExpr.op,
        };
    } else {
        return {
            items: [ntExpr],
            op: Op.And,
        };
    }
}

const itemCountPat = /^(.+) x (\d+)$/;

function getReadableItemName(logic: Logic, item: string) {
    if (item in prettyItemNames) {
        return prettyItemNames[item][1];
    }

    const match = item.match(itemCountPat);
    if (match) {
        const [, baseName, count] = match;
        if (baseName in prettyItemNames) {
            const pretty = prettyItemNames[baseName][parseInt(count, 10)];
            if (pretty) {
                return pretty;
            }
        }
    }

    const check = logic.checks[item];
    if (check) {
        return check.name;
    }

    return _.last(item.split('\\'))!;
}