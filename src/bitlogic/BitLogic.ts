import { LogicalExpression } from "./LogicalExpression";
import { BitVector } from './BitVector';
import _ from 'lodash';

export interface BitLogic {
    /**
     * The number of bits in this logic.
     */
    numBits: number;
    /**
     * Array index is bit index. value at that index is a logical
     * expression that, if evaluated to true, implies the given bit index.
     * Always of length numBits.
     */
    implications: LogicalExpression[];
}

/**
 * Compute the logical result of the given implications.
 */
export function interpretLogic(
    /** The base BitLogic with its base implications. */
    logic: BitLogic,
    /**
     * Additional implications from runtime conditions that aren't part of the base logic.
     * Must not overwrite each other, and may only overwrite a base implication from `logic`
     * if the BitLogic's expression is trivially false (an empty disjunction).
     */
    additionalImplications: Record<number, LogicalExpression>[],
    /**
     * To resume computation from an earlier result after making monotonous changes to `additionalImplications`
     * (concretely: semilogic requirements), pass startingBits. Purely a performance optimization.
     */
    startingBits?: BitVector,
) {
    const effectiveImplications = logic.implications.slice();
    for (const [idx, expr] of logic.implications.entries()) {
        const reqs = _.compact([expr.isTriviallyFalse() ? undefined : expr, ...additionalImplications.map((m) => m[idx])]);
        if (reqs.length > 1) {
            console.warn('requirements overwriting', idx);
        }
        effectiveImplications[idx] = _.last(reqs) ?? expr;
    }

    const bits = startingBits?.clone() ?? new BitVector(logic.numBits);
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

    return bits;
}

/**
 * Some requirements still have some relatively deep expressions, and the `computeExpression` algorithm may perform poorly
 * if it repeately has to reveal a complex entrance. Finding *any* path to the check has a reasonably likelyhood
 * of including these bottlenecks, and precomputing bits in that partial path can solve a lot of problems and the
 * results can even be reused.
 */
export function anyPath(
    /** Do not reveal these bits */
    opaqueBits: BitVector,
    /** Traverse these implications... */
    implications: LogicalExpression[],
    /** ...starting from here. */
    idx: number,
    /**
     * Expressions we've already revealed/precomputed
     * in a previous run, used to reveal new paths
     * and stop searching if there aren't any paths remaining.
     */
    revealedExpressions: Set<number>,
    visitedExpressions: Set<number> = new Set(),
): BitVector | undefined {
    if (visitedExpressions.has(idx)) {
        return undefined;
    }
    const expr = implications[idx];
    if (expr.isTriviallyFalse()) {
        return undefined;
    }

    visitedExpressions.add(idx);

    const thisBit = new BitVector(opaqueBits.size).setBit(idx);

    for (const conj of implications[idx].conjunctions) {
        for (const bit of conj.iter()) {
            if (!opaqueBits.test(bit) && !revealedExpressions.has(bit)) {
                const moreBits = anyPath(
                    opaqueBits,
                    implications,
                    bit,
                    revealedExpressions,
                    visitedExpressions,
                );
                if (moreBits) {
                    return thisBit.or(moreBits);
                }
            }
        }
    }

    visitedExpressions.delete(idx);
    return thisBit;
}

/**
 * Turn the expression at idx into an expression
 * that is only based on `opaqueBits`.
 */
export function computeExpression(
    opaqueBits: BitVector,
    implications: LogicalExpression[],
    idx: number,
    visitedExpressions: Set<number> = new Set(),
): LogicalExpression {
    let result = LogicalExpression.false();
    if (visitedExpressions.has(idx)) {
        return result;
    }
    visitedExpressions.add(idx);
    nextConj: for (const conj of implications[idx].conjunctions) {
        let tmpExpr = LogicalExpression.true(opaqueBits.size);
        const conjOpaqueBits = opaqueBits.and(conj);
        for (const bit of conj.iter()) {
            if (!conjOpaqueBits.test(bit)) {
                const newTerm = computeExpression(
                    opaqueBits,
                    implications,
                    bit,
                    visitedExpressions,
                );
                if (newTerm.isTriviallyFalse()) {
                    continue nextConj;
                }
                tmpExpr = tmpExpr.and(newTerm).removeDuplicates();
            }
        }
        if (conjOpaqueBits.numSetBits) {
            tmpExpr = tmpExpr.and(conjOpaqueBits);
        }

        result = result.or(tmpExpr);
    }

    visitedExpressions.delete(idx);
    return result.removeDuplicates();
}

export function removeDuplicates(implications: LogicalExpression[]) {
    for (const [idx, expr] of implications.entries()) {
        if (expr.conjunctions.length >= 2) {
            implications[idx] = expr.removeDuplicates();
        }
    }
}

/**
 * Unifies non-opaque requirements if they directly imply each other. This is mostly
 * for simplifying clusters like the Sky, where there are lots of areas that are
 * all equally accessible as long as you're somewhere in the sky. This means one of
 * the unified areas will only have a single bit requirement, which can be inlined later.
 * 
 * Returns true iff any simplifications have been made.
 */
export function unifyRequirements(
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
export function shallowSimplify(
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
        let newExpr = LogicalExpression.false();
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
