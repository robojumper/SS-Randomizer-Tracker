import { BitVector } from './BitVector';
import { LogicalExpression } from './LogicalExpression';
import { Logic } from './Logic';
import _ from 'lodash';

export function interpretLogic(
    logic: Logic,
    settingsImplications: Record<number, LogicalExpression>,
    inventoryImplications: Record<number, LogicalExpression>,
    checksImplications: Record<number, LogicalExpression>,
) {
    const effectiveImplications = logic.implications.slice();
    for (const [idx, expr] of logic.implications.entries()) {
        const reqs = _.compact([expr.isTriviallyFalse() ? undefined : expr, settingsImplications[idx], inventoryImplications[idx], checksImplications[idx]]);
        if (reqs.length > 1) {
            console.warn('requirements overwriting', logic.allItems[idx]);
        }
        effectiveImplications[idx] = _.last(reqs) ?? expr;
    }

    const bits = new BitVector(logic.numItems);
    let changed = true;
    let iterations = 0;
    const start = performance.now();
    while (changed) {
        changed = false;
        for (const [idx, expr] of effectiveImplications.entries()) {
            const evaluate = (e: LogicalExpression) => {
                const val = e.eval(bits);
                if (val) {
                    bits.setBit(idx);
                    return true;
                }
                return false;
            };

            if (expr.isTriviallyFalse()) {
                continue;
            } else if (!bits.test(idx)) {
                const didChange = evaluate(expr);
                changed ||= didChange;
            }
        }
        iterations++;
    }
    console.log(performance.now() - start);
    console.log('iterations', iterations);
    // console.log(fmtVec(logic, bits));

    return bits;
}

export function printExpr(logic: Logic, expr: LogicalExpression) {
    for (const part of expr.conjunctions) {
        console.log(`    | ${fmtVec(logic, part)}`);
    }
}

export function fmtVec(logic: Logic, items: BitVector) {
    let str = '[';
    for (const i of items.iter()) {
        str += logic.allItems[i] + ', ';
    }
    return str + ']';
}
