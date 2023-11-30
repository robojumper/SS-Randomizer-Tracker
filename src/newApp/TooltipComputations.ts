import { BitVector } from '../logic/BitVector';
import { Logic } from '../logic/Logic';
// import { fmtVec } from '../logic/LogicInterpretation';
import { LogicalExpression } from '../logic/LogicalExpression';
import { getTooltipOpaqueBits } from './State';

/**
 * This module contains various strategies to turn the requirements and implications into a more compact and readable
 * form, with the goal of creating readable and understandable requirements for tooltips.
 */

export function getTooltipComputer(
    logic: Logic,
    stateImplications: Record<number, LogicalExpression>,
): (checkId: string) => string {
    const opaqueItemBits = getTooltipOpaqueBits(logic);
    const allImplications = logic.implications.map((val, idx) => {
        const stateImp = stateImplications[idx];
        if (stateImp) {
            return val.or(stateImp);
        } else {
            return val;
        }
    });

    // const oldImplications = allImplications.slice();

    do {
        for (const [idx, expr] of allImplications.entries()) {
            if (expr.conjunctions.length >= 2) {
                allImplications[idx] = expr.removeDuplicates();
            }
        }
        while (shallowSimplify(opaqueItemBits, allImplications)) {
            for (const [idx, expr] of allImplications.entries()) {
                if (expr.conjunctions.length >= 2) {
                    allImplications[idx] = expr.removeDuplicates();
                }
            }
        }
    } while (unifyRequirements(opaqueItemBits, allImplications));

    /*
    for (let idx = 0; idx < logic.numItems; idx++) {
        console.log(logic.allItems[idx], 'needs');
        printInfo(logic, oldImplications[idx]);
        console.log(logic.allItems[idx], 'simplified to');
        printInfo(logic, allImplications[idx]);
    }
    */

    const cachedTooltips: Record<string, LogicalExpression> = {};
    return (checkId: string) => {
        if (!cachedTooltips[checkId]) {
            console.log('computing', logic.checks[checkId].name);
            const start = performance.now();
            cachedTooltips[checkId] = computeExpression(opaqueItemBits, allImplications, logic.items[checkId][1], new Set());
            console.log('done after', performance.now() - start, 'ms', cachedTooltips[checkId].conjunctions.length);
        }

        return cachedTooltips[checkId].conjunctions.map((conj) => `(${[...conj.iter()].map((bit) => logic.allItems[bit]).join(' AND ')})`).join(' OR ');
    }
}

function computeExpression(opaqueBits: BitVector, implications: LogicalExpression[], idx: number, visitedExpressions: Set<number>): LogicalExpression {
    let result = new LogicalExpression([]);
    if (visitedExpressions.has(idx)) {
        return new LogicalExpression([]);
    }
    // console.log(visitedExpressions.size);
    visitedExpressions.add(idx);
    nextConj: for (const conj of implications[idx].conjunctions) {
        let tmpExpr = new LogicalExpression([new BitVector(opaqueBits.size)]);
        const tmpBits = new BitVector(opaqueBits.size);
        for (const bit of conj.iter()) {
            if (opaqueBits.test(bit)) {
                tmpBits.setBit(bit);
            } else {
                const newTerm = computeExpression(opaqueBits, implications, bit, visitedExpressions);
                if (newTerm.isTriviallyFalse()) {
                    continue nextConj;
                }
                tmpExpr = tmpExpr.and(newTerm).removeDuplicates();
            }
        }
        if (tmpBits.numSetBits) {
            tmpExpr = tmpExpr.and(tmpBits);
        }

        result = result.or(tmpExpr);
    }

    visitedExpressions.delete(idx);
    return result.removeDuplicates();
}


/*
function printInfo(logic: Logic, expr: LogicalExpression) {
    for (const part of expr.conjunctions) {
        console.log(`    | ${fmtVec(logic, part)}`);
    }
}
*/

/**
 * Unifies non-opaque requirements if they directly imply each other. This is mostly
 * for simplifying clusters like the Sky, where there are lots of areas that are
 * all equally accessible as long as you're somewhere in the sky. This means one of
 * the unified areas will only have a single bit requirement, which can be inlined later.
 */
function unifyRequirements(
    opaqueBits: BitVector,
    implications: LogicalExpression[],
) {
    let simplified = false;
    for (let a = 0; a < opaqueBits.size; a++) {
        if (opaqueBits.test(a)) {
            continue;
        }
        for (let b = a + 1; b < opaqueBits.size; b++) {
            if (opaqueBits.test(b)) {
                continue;
            }
            const implA = implications[a];
            const implB = implications[b];

            const bImpliesAIndex = implA.conjunctions.findIndex(
                (cA) => cA.numSetBits === 1 && cA.test(b),
            );
            if (bImpliesAIndex === -1) {
                continue;
            }

            const aImpliesBIndex = implB.conjunctions.findIndex(
                (cB) => cB.numSetBits === 1 && cB.test(a),
            );
            if (aImpliesBIndex === -1) {
                continue;
            }

            simplified = true;

            // Copy reqs from a to b
            const implACon = implA.conjunctions.slice();
            const bReqVec = implACon.splice(bImpliesAIndex, 1);
            for (const cn of implACon) {
                implications[b] = implications[b].or(cn);
            }
            implications[a] = new LogicalExpression(bReqVec);
        }
    }

    return simplified;
}

/**
 * Shallow simplification "inlines" non-opaque requirements that themselves only consist
 * of at most one conjunction into upstream conjunctions. A DNF requirement with zero
 * conjunctions is always False, so any conjunctions it appears in can be dropped,
 * while a DNF with exactly one conjunction can be inlined.
 *
 * Returns true iff any simplifications could be made.
 */
function shallowSimplify(
    opaqueBits: BitVector,
    implications: LogicalExpression[],
) {
    const simplificationBits = new BitVector(opaqueBits.size);

    let simplified = false;

    for (let item = 0; item < opaqueBits.size; item++) {
        if (
            !opaqueBits.test(item) &&
            implications[item].conjunctions.length <= 1
        ) {
            simplificationBits.setBit(item);
        }
    }

    for (const [idx, expr] of implications.entries()) {
        if (expr.conjunctions.length >= 30) {
            continue;
        }
        let newExpr = new LogicalExpression([]);
        for (const conj of expr.conjunctions) {
            if (!conj.and(simplificationBits).isEmpty()) {
                simplified = true;
                let newItems = new BitVector(opaqueBits.size);
                let skip = false;
                for (const reqItem of conj.iter()) {
                    if (!simplificationBits.test(reqItem)) {
                        newItems.setBit(reqItem);
                    } else {
                        const revealed = implications[reqItem];

                        /*
                        if (revealed.isTriviallyTrue()) {
                            continue;
                        }
                        */

                        if (revealed.isTriviallyFalse()) {
                            skip = true;
                            break;
                        }
                        newItems = newItems.or(revealed.conjunctions[0]);
                    }
                }
                if (!skip && !newItems.test(idx)) {
                    newExpr = newExpr.or(newItems);
                }
            } else {
                newExpr = newExpr.or(conj);
            }
        }

        implications[idx] = newExpr;
    }
    return simplified;
}
