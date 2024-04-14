import { LogicalExpression } from './LogicalExpression';
import { BitVector } from './BitVector';

/**
 * Requirements are a partial logic that makes statements about the present bits
 * and no statements about absent bits.
 */
export type Requirements = Record<number, LogicalExpression>;
/**
 * A BitLogic models a least fixed-point logic (LFP).
 * Since every LogicalExpression can only mention terms positively
 * (no negation, no quantifiers) this least fixed-point always exists.
 */
export type BitLogic = LogicalExpression[];

export function mergeRequirements(numBits: number, ...reqs: Requirements[]): BitLogic {
    const requirements: LogicalExpression[] = [];
    const mergedRequirements: Requirements = {};
    Object.assign(mergedRequirements, ...reqs);
    for (let i = 0; i < numBits; i++) {
        requirements.push(mergedRequirements[i] ?? LogicalExpression.false());
    }
    return requirements;
}


/* 
 * Returns the least fixed-point of the given requirements,
 * which can be interpreted as the logical result of the given requirements.
 * This is a BitVector from which no new facts can be derived.
 */
export function computeLeastFixedPoint(
    /** Why is this being computed? For logging */
    reason: string,
    /** The BitLogic describing the logic program (requirements). */
    logic: BitLogic,
    /**
     * To resume computation from an earlier result after adding facts to `additionalRequirements`
     * (concretely: semilogic requirements), pass startingBits. Purely a performance optimization.
     */
    startingBits?: BitVector,
) {
    // This is an extremely simple iterate-to-fixpoint solver in O(n^2).
    // There are better algorithms but this usually converges after
    // about 15 rounds.
    const bits = startingBits?.clone() ?? new BitVector();
    let changed = true;
    let iterations = 0;
    const start = performance.now();
    while (changed) {
        changed = false;
        for (const [idx, expr] of logic.entries()) {
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
    console.log(
        reason,
        'fixpoint iteration took',
        performance.now() - start,
        'ms for',
        iterations,
        'iterations',
    );

    return bits;
}

/**
 * Some requirements still have some relatively deep expressions, and the `computeGroundExpression` algorithm may perform poorly
 * if it repeately has to reveal a complex entrance. Finding *any* path to the check has a reasonably likelyhood
 * of including these bottlenecks, and precomputing bits in that partial path can solve a lot of problems and the
 * results can even be reused.
 */
export function findNewSubgoals(
    /** Do not reveal these bits */
    opaqueBits: BitVector,
    /** Traverse these requirements... */
    requirements: LogicalExpression[],
    /** ...starting from here. */
    idx: number,
    /**
     * Expressions we've already precomputed
     * in a previous run, used to reveal new paths
     * and stop searching if there aren't any paths remaining.
     */
    learnedExpressions: Set<number>,
    visitedExpressions: Set<number> = new Set(),
): BitVector | undefined {
    if (visitedExpressions.has(idx)) {
        return undefined;
    }
    const expr = requirements[idx];
    if (expr.isTriviallyFalse()) {
        return undefined;
    }

    if (learnedExpressions.has(idx)) {
        return undefined;
    }

    visitedExpressions.add(idx);

    for (const conj of requirements[idx].conjunctions) {
        for (const bit of conj.iter()) {
            if (!opaqueBits.test(bit) && !learnedExpressions.has(bit)) {
                const moreBits = findNewSubgoals(
                    opaqueBits,
                    requirements,
                    bit,
                    learnedExpressions,
                    visitedExpressions,
                );
                if (moreBits) {
                    return new BitVector()
                        .setBit(bit)
                        .or(moreBits);
                }
            }
        }
    }

    visitedExpressions.delete(idx);
    return new BitVector();
}

/**
 * Convert the expression at `idx` to a first-order logic expression
 * that is only based on the ground terms `opaqueBits` - in other words,
 * create a closed formula for the potentially (self- and nested-)recursive
 * expression at `idx`.
 */
export function computeGroundExpression(
    opaqueBits: BitVector,
    requirements: LogicalExpression[],
    idx: number,
    visitedExpressions: Set<number> = new Set(),
): LogicalExpression {
    let result = LogicalExpression.false();
    if (visitedExpressions.has(idx)) {
        return result;
    }
    visitedExpressions.add(idx);

    // TODO this is a standard BRANCH algorithm but we don't have a BOUND.
    // It'd be useful to know when we've found the minimum requirements and
    // when exploring additional paths wouldn't help.

    // TODO even with a BOUND this may not be the best solution. In practice this
    // works for some requirements, is fairly slow for others, and fails catastrophically
    // for a few unless some specific subgoals are evaluated first (see `findNewSubgoals`).
    // So if you see the tooltips task getting stuck, it's likely here and because `findNewSubgoals`
    // didn't make us learn an important expression.
    // Some alternatives:
    // * Not output a DNF but a multi-level form. This however needs tooltips to implement
    //   more sophisticated simplification algorithms.
    // * Convert the requirements to a proper directed graph structure first, where things like
    //   degree and "bottlenecks" are known, then use better heuristics there.
    // * Find a All-SAT solver that can deal with fixed-point logic.
    //   Good luck with that, SAT solvers need input in CNF, All-SAT solvers seem to
    //   only exist in theory, and cycles are not considered.

    nextConj: for (const conj of requirements[idx].conjunctions) {
        let tmpExpr = LogicalExpression.true();
        const conjOpaqueBits = opaqueBits.and(conj);
        for (const bit of conj.iter()) {
            if (!conjOpaqueBits.test(bit)) {
                const newTerm = computeGroundExpression(
                    opaqueBits,
                    requirements,
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

export function removeDuplicates(logic: BitLogic) {
    for (const [idx, expr] of logic.entries()) {
        if (expr.conjunctions.length >= 2) {
            logic[idx] = expr.removeDuplicates();
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
    requirements: LogicalExpression[],
) {
    // First, an O(n) scan to rule out expressions that are definitely not eligible
    const unificationCandidates: number[][] = requirements.map(() => []);
    for (const [idx, expr] of requirements.entries()) {
        if (opaqueBits.test(idx)) {
            continue;
        }
        for (const conj of expr.conjunctions) {
            if (conj.numSetBits === 1) {
                const bit = conj.getSingleSetBit();
                if (bit === idx || opaqueBits.test(bit)) {
                    continue;
                }
                (unificationCandidates[bit]).push(idx);
            }
        }
    }

    let simplified = false;
    for (let a = 0; a < requirements.length; a++) {
        const targetList = unificationCandidates[a];
        for (const b of targetList) {
            if (tryUnifyEquivalent(requirements, a, b)) {
                simplified = true;
            }
        }
    }

    return simplified;
}

/**
 * Check if:
 *  z <= a
 *  a <= b | x
 *  b <= a | y
 * Rewrite to:
 *  z <= a
 *  a <= b,
 *  b <= x | y,
 * This breaks a cycle between `a` and `b`, and any dependencies on `a`
 * can be rewritten to depend on `b` in a later shallowSimplify call.
 */
function tryUnifyEquivalent(requirements: LogicalExpression[], a: number, b: number) {
    const implA = requirements[a];
    const implB = requirements[b];

    if (implA.conjunctions.length < 2 || implB.conjunctions.length < 2) {
        return false;
    }

    const bImpliesAIndex = implA.conjunctions.findIndex(
        (cA) => cA.numSetBits === 1 && cA.test(b),
    );
    if (bImpliesAIndex === -1) {
        return false;
    }

    const aImpliesBIndex = implB.conjunctions.findIndex(
        (cB) => cB.numSetBits === 1 && cB.test(a),
    );
    if (aImpliesBIndex === -1) {
        return false;
    }

    // Copy reqs from a to b
    const implACon = implA.conjunctions.slice();
    const bReqVec = implACon.splice(bImpliesAIndex, 1);
    for (const cn of implACon) {
        requirements[b] = requirements[b].or(cn);
    }
    requirements[a] = new LogicalExpression(bReqVec);

    return true;
}

/**
 * Shallow simplification "inlines" non-opaque requirements that themselves only consist
 * of at most one conjunction into upstream conjunctions. A DNF requirement with zero
 * conjunctions is always False, so any conjunctions it appears in can be dropped,
 * while a DNF with exactly one conjunction can be inlined.
 *
 * Returns true iff any simplifications could be made.
 * 
 * 
 * E.g:
 *   a <= b&c | f | d
 *   b <= <false>
 *   d <= e
 *   f <= g&h
 * Rewrite to:
 *   a <= g&h | e
 *   b <= <false>
 *   d <= e
 *   f <= g&h
 */
export function shallowSimplify(
    opaqueBits: BitVector,
    requirements: BitLogic,
) {
    const inliningCandidates = new BitVector();

    let simplified = false;

    for (let item = 0; item < requirements.length; item++) {
        if (
            !opaqueBits.test(item) &&
            requirements[item].conjunctions.length <= 1
        ) {
            inliningCandidates.setBit(item);
        }
    }

    for (const [idx, expr] of requirements.entries()) {
        if (expr.conjunctions.length >= 30) {
            continue;
        }
        let newExpr = LogicalExpression.false();
        for (const conj of expr.conjunctions) {
            if (conj.intersects(inliningCandidates)) {
                simplified = true;
                let newItems = new BitVector();
                let skip = false;
                for (const reqItem of conj.iter()) {
                    if (!inliningCandidates.test(reqItem)) {
                        newItems.setBit(reqItem);
                    } else {
                        const revealed = requirements[reqItem];

                        if (revealed.isTriviallyTrue()) {
                            continue;
                        }

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

        requirements[idx] = newExpr;
    }
    return simplified;
}

/**
 * Bottom-up propagation propagates disjuncts that consist of completely
 * opaque bits until a fixpoint is reached.
 * 
 * This is basically symbolic logical state computation - but instead
 * of computing boolean logical state bottom-up, we compute requirements
 * bottom-up, which a fixpoint being reached if requirements don't change anymore.
 */
export function bottomUpTooltipPropagation(
    opaqueBits: BitVector,
    requirements: BitLogic,
) {
    let changed = true;
    let rounds = 0;

    let recentlyChanged: BitVector | undefined = undefined;

    const propagationCandidates = new BitVector();
    // Propagation candidates are non-opaque expressions that contain
    // a disjunct with only opaque bits set.
    for (let item = 0; item < requirements.length; item++) {
        if (
            !opaqueBits.test(item) &&
            requirements[item].conjunctions.some((vec) => vec.isSubsetOf(opaqueBits))
        ) {
            propagationCandidates.setBit(item);
        }
    }

    while (changed) {
        rounds++;
        changed = false;
        const thisRoundChanged = new BitVector();
        const interestingCandidates = recentlyChanged
            ? recentlyChanged.and(propagationCandidates)
            : propagationCandidates;

        for (const [idx, expr] of requirements.entries()) {

            let additionalTerms = LogicalExpression.false();
    
            for (const conj of expr.conjunctions) {
                if (
                    conj.intersects(interestingCandidates)
                ) {
                    const newItems = new BitVector();
                    let toPropagate = LogicalExpression.true();
                    let skip = false;
                    for (const reqBit of conj.iter()) {
                        if (!propagationCandidates.test(reqBit)) {
                            newItems.setBit(reqBit);
                        } else {
                            const revealed = requirements[reqBit];

                            if (revealed.isTriviallyFalse()) {
                                skip = true;
                                break;
                            }

                            // The only terms we can propagate are the ones that are completely opaque
                            const propagationRequirements =
                                new LogicalExpression(
                                    revealed.conjunctions.filter((c) =>
                                        c.isSubsetOf(opaqueBits),
                                    ),
                                );
                            toPropagate = toPropagate
                                .and(propagationRequirements)
                                .removeDuplicates();
                        }
                    }

                    // We record all propagated possibilities in additionalTerms, so that
                    // below we can check if any of the additional terms are useful.
                    if (!skip) {
                        for (const term of toPropagate.conjunctions) {
                            if (!newItems.test(idx)) {
                                additionalTerms = additionalTerms.or(
                                    term.or(newItems),
                                );
                            }
                        }
                    }
                }
            }

            const [useful, newExpr] = expr.orExtended(additionalTerms);
            if (useful) {
                thisRoundChanged.setBit(idx);
                changed = true;
                requirements[idx] = newExpr;
                propagationCandidates.setBit(idx);
            }
        }

        recentlyChanged = thisRoundChanged;
    }


    // We've reached a fixed point, which means we cannot find any new paths
    // in our requirement graph. So every requirement that relies on non-opaque
    // bits is recursive in some way, and these recursive requirements can be dropped
    // 
    for (const [idx, expr] of requirements.entries()) {
        requirements[idx] = new LogicalExpression(
            expr.conjunctions.filter((c) => c.isSubsetOf(opaqueBits)),
        );
    }

    console.log('bottom-up tooltip requirements took', rounds, 'rounds');
}