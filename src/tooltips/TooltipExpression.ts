import { last, sumBy } from 'es-toolkit';
import prettyItemNames_ from '../data/prettyItemNames.json';
import { itemName } from '../logic/Inventory';
import type { LogicalState } from '../logic/Locations';
import type { Logic2 } from '../logic/logic2/Logic';
import { chainComparators, compareBy } from '../utils/Compare';
import type {
    RecursiveTooltipRequirement2,
    TooltipRequirement2,
} from './worker/BitIndex';

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
    op: 'and' | 'or';
}

export type TooltipExpression = TerminalRequirement | NonterminalRequirement;

export type RootTooltipExpression = NonterminalRequirement & { op: 'and' };

const impossible: RootTooltipExpression = {
    type: 'expr',
    op: 'and',
    items: [
        {
            type: 'item',
            item: 'Impossible (discover an entrance first)',
            logicalState: 'outLogic',
        },
    ],
};

const nothing: RootTooltipExpression = {
    type: 'expr',
    op: 'and',
    items: [
        {
            type: 'item',
            item: 'Nothing',
            logicalState: 'inLogic',
        },
    ],
};

function numTerms(item: TooltipExpression): number {
    if (item.type === 'expr') {
        return sumBy(item.items, numTerms);
    }
    return 1;
}

function getLength(item: TooltipExpression): number {
    if (item.type === 'expr') {
        return numTerms(item);
    } else {
        return -1;
    }
}

function getName(item: TooltipExpression): string {
    if (item.type === 'expr') {
        return '';
    } else {
        return item.item;
    }
}

function booleanExprToTooltipExprRecursive(
    logic: Logic2,
    expr: RecursiveTooltipRequirement2,
    getRequirementLogicalState: (
        requirement: TooltipRequirement2,
    ) => LogicalState,
): NonterminalRequirement {
    const mapItem = (item: RecursiveTooltipRequirement2): TooltipExpression => {
        if (item.type === 'and' || item.type === 'or') {
            return booleanExprToTooltipExprRecursive(
                logic,
                item,
                getRequirementLogicalState,
            );
        } else {
            return {
                type: 'item',
                item: getReadableItemName(item),
                logicalState: getRequirementLogicalState(item),
            };
        }
    };
    if (expr.type !== 'and' && expr.type !== 'or') {
        throw new Error('expected top level tooltips expr to be and/or');
    }
    const items = expr.terms
        .map(mapItem)
        .sort(chainComparators(compareBy(getLength), compareBy(getName)));
    return {
        type: 'expr',
        op: expr.type,
        items,
    };
}

export function booleanExprToTooltipExpr(
    logic: Logic2,
    expr: RecursiveTooltipRequirement2,
    getRequirementLogicalState: (
        requirement: TooltipRequirement2,
    ) => LogicalState,
): RootTooltipExpression {
    const ntExpr = booleanExprToTooltipExprRecursive(
        logic,
        expr,
        getRequirementLogicalState,
    );

    if (!ntExpr.items.length) {
        return ntExpr.op === 'and' ? nothing : impossible;
    }

    if (ntExpr.op === 'and') {
        return {
            type: 'expr',
            items: ntExpr.items,
            op: ntExpr.op,
        };
    } else {
        return {
            type: 'expr',
            items: [ntExpr],
            op: 'and',
        };
    }
}

function getReadableItemName(item: TooltipRequirement2): string {
    switch (item.type) {
        case 'item':
            if (item.name in prettyItemNames) {
                return prettyItemNames[item.name][item.count];
            } else {
                return itemName(item.name, item.count);
            }
        case 'rupeeCapacity':
            return `Wallet Capacity >= ${item.amount}`;
        case 'gratitudeCrystals':
            return `${item.amount} Gratitude Crystals`;
        case 'trick':
            return `${item.name} Trick`;
        case 'auxItem':
            return last(item.name.split('\\'))!;
    }
}
