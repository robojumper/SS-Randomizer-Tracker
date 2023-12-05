import _ from "lodash";
import BooleanExpression from "../newApp/BooleanExpression";

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