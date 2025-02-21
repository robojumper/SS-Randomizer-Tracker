// Please don't use interfaces here - messages need to be exact since we cannot afford
// accidentally serializing huge or unserializable data.

import type { ExitMapping } from '../../logic/Locations';
import type { Logic2 } from '../../logic/logic2/Logic';

/** The part of Logic that we can send across to a web worker, only the parts we need for tooltips. */
export type LeanLogic = Pick<
    Logic2,
    'areas' | 'requirements' | 'exits' | 'entrances' | 'events'
>;

/** A message from our tooltips cache to its worker. */
export type WorkerRequest =
    | {
          type: 'initialize';
          logic: LeanLogic;
          exits: ExitMapping[];
      }
    | {
          type: 'analyze';
          checkId: string;
      };

export type SerializedItem = string | SerializedBooleanExpression;

export type SerializedBooleanExpression = {
    type: 'and' | 'or';
    items: SerializedItem[];
};

/** A message from the worker. */
export type WorkerResponse = {
    checkId: string;
    expression: SerializedBooleanExpression;
};
