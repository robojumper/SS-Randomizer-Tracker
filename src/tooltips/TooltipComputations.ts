import { BitVector } from '../logic/bitlogic/BitVector';
import { Logic } from '../logic/Logic';
import { getTooltipOpaqueBits } from '../logic/Inventory';
import BooleanExpression from '../logic/booleanlogic/BooleanExpression';
import {
    BitLogic,
} from '../logic/bitlogic/BitLogic';
import { OptionDefs, TypedOptions } from '../permalink/SettingsTypes';
import { WorkerRequest, WorkerResponse } from './worker/Types';
import { deserializeBooleanExpression, serializeLogicalExpression } from './worker/Utils';

/**
 * This module contains various strategies to turn the requirements into a more compact and readable
 * form, with the goal of creating readable and understandable requirements for tooltips.
 */

/**
 * The TooltipComputer acts as:
 * * A cache for computed tooltip expressions,
 * * A task queue for the tooltip computation worker, and
 * * A subscribeable store for tooltip components to request tooltip computations.
 */
export class TooltipComputer {
    logic: Logic;
    subscriptions: Record<string, { checkId: string; callback: () => void }>;
    results: Record<string, BooleanExpression>;

    opaqueBits: BitVector;
    requirements: BitLogic;
    learned: Set<number>;

    isWorking: boolean;
    cleanup: () => void;
    worker: Worker;

    constructor(
        logic: Logic,
        options: OptionDefs,
        settings: TypedOptions,
        expertMode: boolean,
        requirements: BitLogic,
    ) {
        this.logic = logic;
        this.subscriptions = {};
        this.learned = new Set();
        this.results = {};
        this.isWorking = false;
        this.opaqueBits = getTooltipOpaqueBits(
            logic,
            options,
            settings,
            expertMode,
        );

        this.requirements = requirements;

        const { worker, cleanup } = createWorker();
        this.worker = worker;
        this.cleanup = cleanup;

        worker.postMessage({
            type: 'initialize',
            opaqueBits: [...this.opaqueBits.iter()],
            requirements: requirements.map(serializeLogicalExpression),
            logic: logic
        } satisfies WorkerRequest);
        worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
            this.acceptTaskResult(ev.data.checkId, deserializeBooleanExpression(ev.data.expression));
            this.isWorking = false;
            this.checkForTask();
        }
    }

    notifyAll() {
        for (const entry of Object.values(this.subscriptions)) {
            entry.callback();
        }
    }

    notify(check: string) {
        for (const entry of Object.values(this.subscriptions)) {
            if (entry.checkId === check) {
                entry.callback();
            }
        }
    }

    subscribe(subscriptionId: string, checkId: string, callback: () => void) {
        this.subscriptions[subscriptionId] = { checkId, callback };
        this.checkForTask();
        return () => delete this.subscriptions[subscriptionId];
    }

    getSnapshot(checkId: string): BooleanExpression | undefined {
        return this.results[checkId];
    }

    destroy() {
        this.cleanup();
    }

    getNextTask() {
        if (!this.requirements) {
            return undefined;
        }

        const checkId = Object.values(this.subscriptions).find(
            (check) => !this.results[check.checkId],
        )?.checkId;
        if (!checkId) {
            return undefined;
        }

        return {
            checkId,
        };
    }

    acceptTaskResult(checkId: string, result: BooleanExpression) {
        this.results[checkId] = result;
        this.notify(checkId);
    }

    checkForTask() {
        if (this.isWorking) {
            return;
        }
        const task = this.getNextTask();
        if (!task) {
            return;
        }
        this.isWorking = true;
        this.worker.postMessage({ type: 'analyze', checkId: task.checkId } satisfies WorkerRequest);
    }
}

function createWorker() {
    const worker = new Worker(
        new URL(
            './worker/Worker',
            import.meta.url,
        ),
    );

    const cleanup = () => {
        worker.terminate();
    };

    return { worker, cleanup };
}
