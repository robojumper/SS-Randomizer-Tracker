import BooleanExpression from '../../logic/booleanlogic/BooleanExpression';
import type { ExitMapping } from '../../logic/Locations';
import { appDebug } from '../../utils/Debug';
import { dnfToRequirementExpr } from './Algorithms';
import type { LeanLogic, WorkerRequest, WorkerResponse } from './Types';
import { serializeBooleanExpression } from './Utils';

/**
 * This module contains various strategies to turn the requirements into a more compact and readable
 * form, with the goal of creating readable and understandable requirements for tooltips.
 */

/**
 * Global application state. Will be initialized with the first message.
 */
interface GlobalState {
    logic: LeanLogic;
    exits: ExitMapping[];
}

let g: GlobalState;

appDebug('Hello from worker!');

self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
    const start = performance.now();
    switch (ev.data.type) {
        case 'initialize': {
            g = {
                logic: ev.data.logic,
                exits: ev.data.exits,
            };

            const start2 = performance.now();
            bottomUpTooltipPropagation(g.opaqueBits, g.requirementsForBottomUp);
            appDebug(
                'worker',
                'fixpoint propagation took',
                performance.now() - start2,
                'ms',
            );

            break;
        }
        case 'analyze': {
            if (!g) {
                throw new Error('needs to be initialized first!!!!');
            }
            const expr = analyze(ev.data.checkId);
            appDebug(
                'worker',
                'total time for',
                ev.data.checkId,
                'was',
                performance.now() - start,
                'ms',
            );
            postMessage({
                checkId: ev.data.checkId,
                expression: serializeBooleanExpression(expr),
            } satisfies WorkerResponse);
        }
    }
};

function analyze(checkId: string): BooleanExpression {
    const bit = g.logic.itemBits[checkId];
    const bottomUpExpression =
        g.requirementsForBottomUp[bit].removeDuplicates();
    const simplifyStart = performance.now();
    const simplified = dnfToRequirementExpr(
        g.logic,
        bottomUpExpression.conjunctions,
    );
    appDebug(
        '  ',
        'worker',
        'simplifying took',
        performance.now() - simplifyStart,
        'ms',
    );
    return simplified;
}
