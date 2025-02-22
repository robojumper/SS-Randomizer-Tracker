import { pick } from 'es-toolkit';
import type { SearchExits2 } from '../logic/logic2/Entrance';
import type { Logic2 } from '../logic/logic2/Logic';
import type { RecursiveTooltipRequirement2 } from './worker/BitIndex';
import type { WorkerRequest, WorkerResponse } from './worker/Types';

/**
 * The TooltipComputer acts as:
 * * A cache for computed tooltip expressions,
 * * A task queue for the tooltip computation worker, and
 * * A subscribeable store for tooltip components to request tooltip computations.
 */
export class TooltipComputer {
    subscriptions: Set<{ checkId: string; callback: () => void }>;
    results: Record<string, RecursiveTooltipRequirement2>;

    isWorking: boolean;
    cleanup: () => void;
    worker: Worker | undefined;

    constructor(logic: Logic2, exits: SearchExits2) {
        this.subscriptions = new Set();
        this.results = {};
        this.isWorking = false;

        const { worker, cleanup } = createWorker();
        this.worker = worker;
        this.cleanup = cleanup;

        worker.postMessage({
            type: 'initialize',
            logic: pick(logic, [
                'areas',
                'requirements',
                'exits',
                'entrances',
                'events',
            ]),
            exits,
        } satisfies WorkerRequest);
        worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
            this.acceptTaskResult(ev.data.checkId, ev.data.expression);
            this.isWorking = false;
            this.checkForTask();
        };
    }

    notifyAll() {
        for (const entry of this.subscriptions.keys()) {
            entry.callback();
        }
    }

    notify(check: string) {
        for (const entry of this.subscriptions.keys()) {
            if (entry.checkId === check) {
                entry.callback();
            }
        }
    }

    subscribe(checkId: string, callback: () => void) {
        const entry = { checkId, callback };
        this.subscriptions.add(entry);
        this.checkForTask();
        return () => this.subscriptions.delete(entry);
    }

    getSnapshot(checkId: string): RecursiveTooltipRequirement2 | undefined {
        return this.results[checkId];
    }

    destroy() {
        this.cleanup();
        this.worker = undefined;
    }

    getNextTask() {
        for (const { checkId } of this.subscriptions.keys()) {
            if (!this.results[checkId]) {
                return { checkId };
            }
        }
        return undefined;
    }

    acceptTaskResult(checkId: string, result: RecursiveTooltipRequirement2) {
        this.results[checkId] = result;
        this.notify(checkId);
    }

    checkForTask() {
        if (this.isWorking || !this.worker) {
            return;
        }
        const task = this.getNextTask();
        if (!task) {
            return;
        }
        this.isWorking = true;
        this.worker.postMessage({
            type: 'analyze',
            checkId: task.checkId,
        } satisfies WorkerRequest);
    }
}

function createWorker() {
    const worker = new Worker(new URL('./worker/Worker', import.meta.url), {
        type: 'module',
    });

    const cleanup = () => {
        worker.terminate();
    };

    return { worker, cleanup };
}
