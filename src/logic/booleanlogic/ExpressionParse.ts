import _ from "lodash";
import BooleanExpression, { Item } from "./BooleanExpression";
import { BitVector } from "../bitlogic/BitVector";
import { andToDnf } from "../bitlogic/LogicalExpression";

export function parseExpression(expression: string) {
    return booleanExpressionForTokens(splitExpression(expression));
}

function splitExpression(expression: string) {
    return _.compact(
        _.map(expression.split(/\s*([(&|)])\s*/g), _.trim),
    );
}

function booleanExpressionForTokens(expressionTokens: string[]): BooleanExpression {
    const itemsForExpression = [];
    let expressionTypeToken;
    while (!_.isEmpty(expressionTokens)) {
        const currentToken = expressionTokens.shift()!;
        if (currentToken === '&' || currentToken === '|') {
            expressionTypeToken = currentToken;
        } else if (currentToken === '(') {
            const childExpression = booleanExpressionForTokens(expressionTokens);
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
    size: number,
    expr: Item,
    lookup: (text: string) => number,
): BitVector[] {
    if (BooleanExpression.isExpression(expr)) {
        switch (expr.type) {
            case 'or':
                return expr.items.flatMap((item) =>
                    booleanExprToLogicalExpr(size, item, lookup),
                );
            case 'and': {
                const mapped = expr.items.map((i) => booleanExprToLogicalExpr(size, i, lookup));
                return andToDnf(size, mapped);
            }
            default: {
                throw new Error('unreachable');
            }
        }
    } else {
        if (expr === 'True') {
            return [new BitVector(size)];
        } else if (expr === 'False') {
            return [];
        } else {
            const bit_idx = lookup(expr);
            return [new BitVector(size).setBit(bit_idx)];
        }
    }
}
