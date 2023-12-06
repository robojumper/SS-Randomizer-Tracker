import { noop } from 'lodash';
import { BitVector } from '../logic/bitlogic/BitVector';
import { Logic } from '../logic/Logic';
import { LogicalExpression } from '../logic/bitlogic/LogicalExpression';
import { getTooltipOpaqueBits } from '../logic/Inventory';
import BooleanExpression from '../logic/booleanlogic/BooleanExpression';
import { anyPath, computeExpression, removeDuplicates, shallowSimplify, unifyRequirements } from '../logic/bitlogic/BitLogic';
import { mapToCanAccessCubeRequirement } from '../logic/TrackerModifications';

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

        this.implications = this.logic.bitLogic.implications.map((val, idx) => {
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
            (check) => !this.#results[check.checkId]
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

        let checkId = task.checkId;
        if (store.logic.checks[checkId].type === 'tr_cube') {
            checkId = mapToCanAccessCubeRequirement(checkId);
        }

        const bit = store.logic.items[checkId][1];

        const potentialPath = anyPath(
            store.opaqueBits,
            store.implications,
            bit,
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

function opaqueImplies(a: string, b: string) {
    return a === b;
}

function dnfToRequirementExpr(
    logic: Logic,
    expression: LogicalExpression,
): BooleanExpression {

    const presentBits = new Set(expression.conjunctions.flatMap((c) => [...c.iter()]));

    const expr = BooleanExpression.or(
        ...expression.conjunctions.map((c) => bitVecToRequirements(logic, presentBits, c)),
    ).simplify(opaqueImplies);

    function recursivelySimplify(expr: BooleanExpression) {
        for (let i = 0; i < expr.items.length; i++) {
            let item = expr.items[i];
            if (BooleanExpression.isExpression(item)) {
                item = recursivelySimplify(item);
                item = item.simplify(opaqueImplies);

                expr.items[i] = item;
            }
        }
        return expr.simplify(opaqueImplies);
    }

    return recursivelySimplify(expr).simplify(simplifier(logic));
}

function bitVecToRequirements(logic: Logic, presentBits: Set<number>, vec: BitVector): BooleanExpression {
    return BooleanExpression.and(
        // ...[...vec.iter()].map((x) => logic.allItems[x]),
        ...[...vec.iter()].flatMap((x) => [logic.allItems[x], ...(logic.reverseDominators[logic.allItems[x]]?.filter((i) => presentBits.has(logic.items[i][1])) ?? [])]),
    );
}
