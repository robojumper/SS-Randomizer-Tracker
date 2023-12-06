import { BitVector } from './BitVector';

/**
 * A logical expression in DNF (disjunctive normal form).
 */
export class LogicalExpression {
    #conjunctions: BitVector[];

    static false() {
        return new LogicalExpression([]);
    }

    static true(size: number) {
        return new LogicalExpression([new BitVector(size)]);
    }

    constructor(conjs: BitVector[]) {
        this.#conjunctions = conjs;
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
                andToDnf2(this.#conjunctions, [other]),
            );
        }

        const size =
            this.#conjunctions[0]?.size ?? other.#conjunctions[0]?.size;
        if (size === undefined) {
            return LogicalExpression.false();
        }
        return new LogicalExpression(
            andToDnf2(this.#conjunctions, other.#conjunctions),
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

            const strongerTerm = terms.findIndex((t) =>
                candidate.isSubsetOf(t),
            );
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
        return (
            this.#conjunctions.length > 0 &&
            this.#conjunctions.some((c) => c.numSetBits === 0)
        );
    }
}

export function andToDnf2(left: BitVector[], right: BitVector[]): BitVector[] {
    const newExpr = [];
    for (const l of left) {
        for (const r of right) {
            newExpr.push(l.or(r));
        }
    }
    return newExpr;
}

export function andToDnf(size: number, arr: BitVector[][]): BitVector[] {
    const newExpr = [];
    for (const tuple of cartesianProduct(...arr)) {
        const newVec = tuple.reduce(
            (acc, val) => acc.or(val),
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
