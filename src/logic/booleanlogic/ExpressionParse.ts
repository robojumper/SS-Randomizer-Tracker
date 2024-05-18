import _ from 'lodash';
import BooleanExpression, { Item } from './BooleanExpression';
import { BitVector } from '../bitlogic/BitVector';
import { andToDnf } from '../bitlogic/LogicalExpression';
import { CounterThreshold } from '../Logic';

export function parseCounterThreshold(
    expression: string,
): CounterThreshold | undefined {
    const split = expression.split('>=');
    if (split.length === 2) {
        const count = parseInt(split[1].trim(), 10);
        if (!isNaN(count)) {
            return { item: split[0].trim(), count };
        }
    }

    return undefined;
}

export function parseExpression(expression: string) {
    return booleanExpressionForTokens(splitExpression(expression));
}

function splitExpression(expression: string) {
    return _.compact(_.map(expression.split(/\s*([(&|)])\s*/g), _.trim));
}

function booleanExpressionForTokens(
    expressionTokens: string[],
): BooleanExpression {
    const itemsForExpression = [];
    let expressionTypeToken;
    while (!_.isEmpty(expressionTokens)) {
        const currentToken = expressionTokens.shift()!;
        if (currentToken === '&' || currentToken === '|') {
            expressionTypeToken = currentToken;
        } else if (currentToken === '(') {
            const childExpression =
                booleanExpressionForTokens(expressionTokens);
            itemsForExpression.push(childExpression);
        } else if (currentToken === ')') {
            break;
        } else {
            itemsForExpression.push(currentToken);
        }
    }
    if (expressionTypeToken === '|') {
        return BooleanExpression.or(...itemsForExpression);
    }
    return BooleanExpression.and(...itemsForExpression);
}

export function booleanExprToLogicalExpr(
    expr: Item,
    lookup: (text: string) => number,
): BitVector[] {
    if (BooleanExpression.isExpression(expr)) {
        switch (expr.type) {
            case 'or':
                return expr.items.flatMap((item) =>
                    booleanExprToLogicalExpr(item, lookup),
                );
            case 'and': {
                const mapped = expr.items.map((i) =>
                    booleanExprToLogicalExpr(i, lookup),
                );
                return andToDnf(mapped);
            }
            default: {
                throw new Error('unreachable');
            }
        }
    } else {
        if (expr === 'True') {
            return [new BitVector()];
        } else if (expr === 'False' || expr === 'Unknown') {
            return [];
        } else {
            const bit_idx = lookup(expr);
            return [new BitVector().setBit(bit_idx)];
        }
    }
}
