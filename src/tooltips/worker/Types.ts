// Please don't use interfaces here - messages need to be exact since we cannot afford
// accidentally serializing huge or unserializable data.

import { Logic } from '../../logic/Logic';

export type LeanLogic = Pick<Logic, 'allItems' | 'dominators' | 'itemBits'>;

export type WorkerRequest =
    | {
          type: 'initialize';
          logic: LeanLogic;
          opaqueBits: number[];
          requirements: number[][][];
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

export type WorkerResponse = {
    checkId: string;
    expression: SerializedBooleanExpression;
};
