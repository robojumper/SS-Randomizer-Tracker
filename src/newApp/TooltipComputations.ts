import { noop } from 'lodash';
import { BitVector } from '../logic/BitVector';
import { Logic } from '../logic/Logic';
import { LogicalExpression } from '../logic/LogicalExpression';
import { getTooltipOpaqueBits } from './State';
import BooleanExpression from './BooleanExpression';

/**
 * This module contains various strategies to turn the requirements and implications into a more compact and readable
 * form, with the goal of creating readable and understandable requirements for tooltips.
 */

/**
 * A CancelToken should be passed to cancelable functions. Those functions should then check the state of the
 * token and return early.
 */
interface CancelToken {
    readonly canceled: boolean;
}

/**
 * Returns a cancel token and a cancellation function. The token can be passed to functions and checked
 * to see whether it has been canceled. The function can be called to cancel the token.
 */
function withCancel(): [CancelToken, () => void] {
    let isCanceled = false;
    return [
        {
            get canceled() {
                return isCanceled;
            },
        },
        () => (isCanceled = true),
    ];
}

// setTimeout as a promise
function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TooltipComputer {
    logic: Logic;
    #subscriptions: Record<string, { checkId: string; callback: () => void }>;
    #results: Record<string, BooleanExpression>;

    opaqueBits: BitVector;
    implications: LogicalExpression[];
    revealed: Set<number>;

    cancel: () => void;
    wakeupWorker: () => void;

    constructor(logic: Logic, implications: Record<number, LogicalExpression>) {
        this.logic = logic;
        this.#subscriptions = {};
        this.revealed = new Set();
        this.wakeupWorker = noop;
        this.#results = {};
        this.opaqueBits = getTooltipOpaqueBits(logic);

        this.implications = this.logic.implications.map((val, idx) => {
            const stateImp = implications[idx];
            if (stateImp) {
                return val.or(stateImp);
            } else {
                return val;
            }
        });

        const [cancelToken, cancel] = withCancel();
        this.cancel = cancel;
        computationTask(cancelToken, this);
    }

    notifyAll() {
        for (const entry of Object.values(this.#subscriptions)) {
            entry.callback();
        }
    }

    notify(check: string) {
        for (const entry of Object.values(this.#subscriptions)) {
            if (entry.checkId === check) {
                entry.callback();
            }
        }
    }

    subscribe(subscriptionId: string, checkId: string, callback: () => void) {
        this.#subscriptions[subscriptionId] = { checkId, callback };
        this.wakeupWorker();
        return () => delete this.#subscriptions[subscriptionId];
    }

    getSnapshot(checkId: string): BooleanExpression | undefined {
        return this.#results[checkId];
    }

    destroy() {
        this.cancel();
        this.wakeupWorker();
    }

    getNextTask() {
        if (!this.implications) {
            return undefined;
        }

        const checkId = Object.values(this.#subscriptions).find(
            (check) => !this.#results[check.checkId] /* && 
                check.checkId === '\\Lanayru\\Mine\\End\\Chest at the End of Mine', */
        )?.checkId;
        if (!checkId) {
            return undefined;
        }

        return {
            checkId,
        };
    }

    acceptTaskResult(checkId: string, result: BooleanExpression) {
        this.#results[checkId] = result;
        this.notify(checkId);
    }
}

async function computationTask(
    cancelToken: CancelToken,
    store: TooltipComputer,
) {
    do {
        await delay(0);
        removeDuplicates(store.implications);
        await delay(0);
        while (shallowSimplify(store.opaqueBits, store.implications)) {
            await delay(0);
            removeDuplicates(store.implications);
            await delay(0);
        }
    } while (unifyRequirements(store.opaqueBits, store.implications));

    while (!cancelToken.canceled) {
        const task = store.getNextTask();

        if (!task) {
            // The main scenario to avoid here is a wakeupWorker call
            // coming in after we find out there's nothing to do but before
            // we set wakeupWorker for the next promise, which is prevented
            // by the fact that there's no await before this and the Promise
            // executor is called synchronously.
            const promise = new Promise((resolve) => {
                store.wakeupWorker = () => resolve(null);
            });
            await promise;
            continue;
        }

        console.log('analyzing', task.checkId);

        const bit = store.logic.items[task.checkId][1];

        const potentialPath = anyPath(
            store.opaqueBits,
            store.implications,
            bit,
            new Set(),
            store.revealed,
        );

        await delay(0);

        if (potentialPath) {
            for (const precomputeBit of potentialPath.iter()) {
                if (
                    !store.opaqueBits.test(precomputeBit) &&
                    !store.revealed.has(precomputeBit)
                ) {
                    // And then precompute some non-opaque requirements. This persists between tooltips, so
                    // different checks can reuse these results.
                    // Note that even though the result of `anyPath` is obviously path-dependent and depends on the check in question,
                    // this particular call happens in isolation and has no dependencies on the check in question, so reusing is sound!
                    store.implications[precomputeBit] = computeExpression(
                        store.opaqueBits,
                        store.implications,
                        precomputeBit,
                        new Set(),
                    );
                    store.revealed.add(precomputeBit);
                    await delay(0);
                }
            }
        }

        const opaqueOnlyExpr = computeExpression(
            store.opaqueBits,
            store.implications,
            bit,
            new Set(),
        );
        await delay(0);
        store.implications[bit] = opaqueOnlyExpr;
        store.acceptTaskResult(
            task.checkId,
            dnfToRequirementExpr(store.logic, opaqueOnlyExpr),
        );
    }
}

function simplifier(logic: Logic) {
    return (a: string, b: string) => {
        return a === b || Boolean(logic.dominators[b]?.includes(a));
    };
}

function dnfToRequirementExpr(
    logic: Logic,
    expression: LogicalExpression,
): BooleanExpression {

    const presentBits = new Set(expression.conjunctions.flatMap((c) => [...c.iter()]));

    const simplify = simplifier(logic);
    const expr = BooleanExpression.or(
        ...expression.conjunctions.map((c) => bitVecToRequirements(logic, presentBits, c)),
    ).simplify((a, b) => a === b);

    function recursivelySimplify(expr: BooleanExpression) {
        for (let i = 0; i < expr.items.length; i++) {
            let item = expr.items[i];
            if (BooleanExpression.isExpression(item)) {
                item = recursivelySimplify(item);
                item = item.simplify(simplify);

                expr.items[i] = item;
            }
        }
        return expr.simplify(simplify);
    }

    return recursivelySimplify(expr);
}

function bitVecToRequirements(logic: Logic, presentBits: Set<number>, vec: BitVector): BooleanExpression {
    return BooleanExpression.and(
        // ...[...vec.iter()].map((x) => logic.allItems[x]),
        ...[...vec.iter()].flatMap((x) => [logic.allItems[x], ...(logic.reverseDominators[logic.allItems[x]]?.filter((i) => presentBits.has(logic.items[i][1])) ?? [])]),
    );
}

/**
 * Some checks still have some relatively deep expressions, and the `computeExpression` algorithm may perform poorly
 * if it repeately has to reveal a complex entrance. Finding *any* path to the check has a reasonably likelyhood
 * of including these bottlenecks, and precomputing bits in that partial path can solve a lot of problems and the
 * results can even be reused.
 */
function anyPath(
    opaqueBits: BitVector,
    implications: LogicalExpression[],
    idx: number,
    visitedExpressions: Set<number>,
    revealedExpressions: Set<number>,
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
                    visitedExpressions,
                    revealedExpressions,
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

function computeExpression(
    opaqueBits: BitVector,
    implications: LogicalExpression[],
    idx: number,
    visitedExpressions: Set<number>,
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

function removeDuplicates(implications: LogicalExpression[]) {
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
