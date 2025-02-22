import { compact } from 'es-toolkit';
import {
    falseRequirement,
    trueRequirement,
    type FullRequirement2,
} from '../logic2/Requirement';
import BooleanExpression, { type Item } from './BooleanExpression';

export function parseExpression(expression: string) {
    return booleanExpressionForTokens(splitExpression(expression));
}

function splitExpression(expression: string) {
    return compact(
        expression.split(/\s*([(&|)])\s*/g).map((part) => part.trim()),
    );
}

function booleanExpressionForTokens(
    expressionTokens: string[],
): BooleanExpression {
    const itemsForExpression = [];
    let expressionTypeToken;
    while (expressionTokens.length) {
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

export function booleanExprToRequirementExpr(
    expr: Item,
    lookup: (text: string) => FullRequirement2,
): FullRequirement2 {
    if (BooleanExpression.isExpression(expr)) {
        switch (expr.type) {
            case 'or':
                return {
                    type: 'or',
                    terms: expr.items.flatMap((item) =>
                        booleanExprToRequirementExpr(item, lookup),
                    ),
                };
            case 'and': {
                return {
                    type: 'and',
                    terms: expr.items.flatMap((item) =>
                        booleanExprToRequirementExpr(item, lookup),
                    ),
                };
            }
            default: {
                throw new Error('unreachable');
            }
        }
    }

    if (expr === 'True') {
        return trueRequirement();
    } else if (expr === 'False') {
        return falseRequirement();
    } else {
        return lookup(expr);
    }
}
