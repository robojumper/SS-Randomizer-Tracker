import { LogicalExpression } from '../logic/bitlogic/LogicalExpression';
import BooleanExpression, {
    Item,
} from '../logic/booleanlogic/BooleanExpression';
import {
    booleanExprToLogicalExpr,
    parseExpression,
} from '../logic/booleanlogic/ExpressionParse';
import { LeanLogic } from './worker/Types';
import {
    dnfToRequirementExpr,
} from './worker/Worker';

function stringifyExpression(expr: Item): string {
    if (BooleanExpression.isExpression(expr)) {
        return (
            '(' +
            expr.items
                .map(stringifyExpression)
                .join(expr.isAnd() ? ' & ' : ' | ') +
            ')'
        );
    }
    return expr;
}

function simplify(source: string): string {
    const items: string[] = [];
    const booleanExpression = parseExpression(source);
    let terms = booleanExprToLogicalExpr(booleanExpression, (text) => {
        const idx = items.indexOf(text);
        if (idx !== -1) {
            return idx;
        } else {
            items.push(text);
            return items.length - 1;
        }
    });

    const logic: LeanLogic = {
        allItems: items,
        dominators: {},
        itemBits: Object.fromEntries(items.map((i, idx) => [i, idx])),
    };

    terms = new LogicalExpression(terms).removeDuplicates().conjunctions;

    const simplified = dnfToRequirementExpr(logic, terms);
    return stringifyExpression(simplified);
}

test('simplify1', () => {
    expect(
        simplify(
            '(Mitts & Bow) | (Mitts & Clawshots) | (Mitts & Slingshot) | (Mitts & Beetle) | (Bomb & Bow) | (Bomb & Clawshots) | (Bomb & Slingshot) | (Bomb & Beetle)',
        ),
    ).toMatchInlineSnapshot(
        `"((Mitts | Bomb) & (Bow | Clawshots | Slingshot | Beetle))"`,
    );
});
