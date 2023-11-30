import BooleanExpression, { Item } from './BooleanExpression';
import { BitVector } from './BitVector';
import { parseExpression } from './ExpressionParse';

/**
 * A logical expression in DNF (disjunctive normal form).
 */
export class LogicalExpression {
    #conjunctions: BitVector[];

    constructor(conjs: BitVector[]);
    constructor(size: number, expr: string, lookup: (text: string) => number);
    constructor(
        arg0: number | BitVector[],
        expr?: string,
        lookup?: (text: string) => number,
    ) {
        if (typeof arg0 === 'number') {
            this.#conjunctions = convert(arg0, parseExpression(expr!), lookup!);
        } else {
            this.#conjunctions = arg0;
        }
    }

    or(other: LogicalExpression | BitVector) {
        if (other instanceof BitVector) {
            return new LogicalExpression([...this.#conjunctions, other]);
        } else {
            return new LogicalExpression([
                ...this.#conjunctions,
                ...other.#conjunctions,
            ]);
        }
    }

    and(other: LogicalExpression | BitVector) {
        if (other instanceof BitVector) {
            return new LogicalExpression(
                andToDnf(other.size, [this.#conjunctions, [other]]),
            );
        }

        const size =
            this.#conjunctions[0]?.size ?? other.#conjunctions[0]?.size;
        if (size === undefined) {
            return new LogicalExpression([]);
        }
        return new LogicalExpression(
            andToDnf(size, [this.#conjunctions, other.#conjunctions]),
        );
    }

    drop_unless(drop: number, unless: number) {
        return new LogicalExpression(
            this.#conjunctions.map((c) =>
                c.test(unless) ? c : c.clearBit(drop),
            ),
        );
    }

    removeDuplicates() {
        const terms: BitVector[] = [];
        for (let i = 0; i < this.#conjunctions.length; i++) {
            const candidate = this.#conjunctions[i];
            const weakerTerm = terms.findIndex((t) => t.isSubsetOf(candidate));
            if (weakerTerm !== -1) {
                continue;
            }

            const strongerTerm = terms.findIndex((t) => candidate.isSubsetOf(t));
            if (strongerTerm !== -1) {
                terms[strongerTerm] = candidate;
            } else {
                terms.push(candidate);
            }
        }
        return new LogicalExpression(terms);
    }

    eval(vec: BitVector) {
        return this.#conjunctions.some((c) => c.isSubsetOf(vec));
    }

    get conjunctions() {
        return this.#conjunctions;
    }

    isTriviallyFalse() {
        return this.#conjunctions.length === 0;
    }

    isTriviallyTrue() {
        return this.#conjunctions.length > 0 && this.#conjunctions.some((c) => c.numSetBits === 0);
    }
}

function andToDnf(size: number, arr: BitVector[][]): BitVector[] {
    const newExpr = [];
    for (const tuple of cartesianProduct(...arr)) {
        const newVec = tuple.reduce(
            (acc, val) =>
                acc.or(val),
            new BitVector(size),
        );
        newExpr.push(newVec);
    }
    return newExpr;
}

export function cartesianProduct<T>(...allEntries: T[][]): T[][] {
    return allEntries.reduce<T[][]>(
        (results, entries) =>
            results
                .map((result) => entries.map((entry) => result.concat([entry])))
                .reduce((subResults, result) => subResults.concat(result), []),
        [[]],
    );
}

function convert(
    size: number,
    expr: Item,
    lookup: (text: string) => number,
): BitVector[] {
    if (BooleanExpression.isExpression(expr)) {
        switch (expr.type) {
            case 'or':
                return expr.items.flatMap((item) =>
                    convert(size, item, lookup),
                );
            case 'and': {
                const mapped = expr.items.map((i) => convert(size, i, lookup));
                return andToDnf(size, mapped);
            }
            default: {
                throw new Error('unreachable');
            }
        }
    } else {
        if (expr === 'True') {
            return [new BitVector(size)];
        } else if (expr === 'False') {
            return [];
        } else {
            const bit_idx = lookup(expr);
            return [new BitVector(size).setBit(bit_idx)];
        }
    }
}
