import { BitVector } from './BitVector';
import { LogicalExpression } from './LogicalExpression';
import { Logic } from './Logic';

export function interpretLogic(
    logic: Logic,
    items: BitVector,
    implications: Record<number, LogicalExpression>,
) {
    const startingItems = logic.startingItems.or(items);

    const bits = startingItems;
    let changed = true;
    let iterations = 0;
    const start = performance.now();
    while (changed) {
        changed = false;
        for (const [idx, expr] of logic.implications.entries()) {
            const evaluate = (e: LogicalExpression) => {
                const val = e.eval(bits);
                if (val) {
                    /*
                    console.log("The following are all true: ");
                    console.log(`    ${fmtVec(logic, bits)}`);
                    console.log(`${logic.allItems[idx]} needs:`);
                    for (const part of e.conjunctions) {
                        console.log(`    | ${fmtVec(logic, part)}`);
                    }
                    console.log(`This implies ${logic.allItems[idx]}`);
                    */
                    bits.setBit(idx);
                    return true;
                }
                return false;
            };

            const runtimeExpr = implications[idx];
            if (runtimeExpr && !bits.test(idx)) {
                const didChange = evaluate(runtimeExpr);
                changed ||= didChange;
            }

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
