import { BitVector } from './BitVector';

/**
 * A logical expression in DNF (disjunctive normal form).
 */
export class LogicalExpression {
    conjunctions: BitVector[];

    /** Creates an expression that always evaluates to false. */
    static false() {
        return new LogicalExpression([]);
    }

    /** Creates an expression that always evaluates to true. */
    static true() {
        return new LogicalExpression([new BitVector()]);
    }

    /** Constructs an expression from the given BitVectors describing a DNF expression. */
    constructor(conjs: BitVector[]) {
        this.conjunctions = conjs;
    }

    /**
     * Constructs an expression that evaluates to true if `this`
     * evaluates to true or `other` evaluates to true.
     */
    or(other: LogicalExpression | BitVector) {
        if (other instanceof BitVector) {
            return new LogicalExpression([...this.conjunctions, other]);
        } else {
            return new LogicalExpression([
                ...this.conjunctions,
                ...other.conjunctions,
            ]);
        }
    }

    /**
     * Constructs an expression that evaluates to true if `this`
     * evaluates to true and `other` evaluates to true.
     */
    and(other: LogicalExpression | BitVector) {
        if (other instanceof BitVector) {
            return new LogicalExpression(
                andToDnf2(this.conjunctions, [other]),
            );
        }

        if (this.isTriviallyFalse() || other.isTriviallyFalse()) {
            return LogicalExpression.false();
        }
        return new LogicalExpression(
            andToDnf2(this.conjunctions, other.conjunctions),
        );
    }

    /**
     * From each conjunction in the DNF, removes `drop` unless the
     * `unless` bit is set.
     */
    drop_unless(drop: number, unless: number) {
        return new LogicalExpression(
            this.conjunctions.map((c) =>
                c.test(unless) ? c : c.clone().clearBit(drop),
            ),
        );
    }

    /**
     * Simplifies the expression by removing disjuncts that are implied by a another disjunct.
     */
    removeDuplicates() {
        const terms: BitVector[] = [];
        for (let i = 0; i < this.conjunctions.length; i++) {
            const candidate = this.conjunctions[i];
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

    /**
     * Computes .or, and returns true iff it resulted in
     * the terms of `this` changing.
     */
    orExtended(other: LogicalExpression) {
        const terms: BitVector[] = [...this.conjunctions];
        let useful = false;

        const otherTerms = other.removeDuplicates().conjunctions;
        for (let i = 0; i < otherTerms.length; i++) {
            const candidate = otherTerms[i];
            const weakerTerm = terms.findIndex((t) => t.isSubsetOf(candidate));
            if (weakerTerm !== -1) {
                continue;
            }

            useful = true;

            const strongerTerm = terms.findIndex((t) =>
                candidate.isSubsetOf(t),
            );
            if (strongerTerm !== -1) {
                terms[strongerTerm] = candidate;
            } else {
                terms.push(candidate);
            }
        }
        return [useful, new LogicalExpression(terms)] as const;
    }

    /**
     * Evaluates the expression assuming the variables in `vec` are true.
     */
    eval(vec: BitVector) {
        return this.conjunctions.some((c) => c.isSubsetOf(vec));
    }

    /**
     * Whether the expression always definitely evaluates to false.
     */
    isTriviallyFalse() {
        return this.conjunctions.length === 0;
    }

    /**
     * Whether the expression always definitely evaluates to true.
     */
    isTriviallyTrue() {
        return (
            this.conjunctions.length > 0 &&
            this.conjunctions.some((c) => c.isEmpty())
        );
    }
}

/**
 * An optimized (unrolled) version of `andToDnf` for AND-ing exactly two expressions.
 */
function andToDnf2(left: BitVector[], right: BitVector[]): BitVector[] {
    const newExpr = [];
    for (const l of left) {
        for (const r of right) {
            newExpr.push(l.or(r));
        }
    }
    return newExpr;
}

export function andToDnf(arr: BitVector[][]): BitVector[] {
    if (arr.length === 2) {
        return andToDnf2(arr[0], arr[1]);
    }
    const newExpr = [];
    for (const tuple of cartesianProduct(...arr)) {
        const newVec = tuple.reduce(
            (acc, val) => acc.or(val),
            new BitVector(),
        );
        newExpr.push(newVec);
    }
    return newExpr;
}

function cartesianProduct<T>(...allEntries: T[][]): T[][] {
    return allEntries.reduce<T[][]>(
        (results, entries) =>
            results
                .map((result) => entries.map((entry) => result.concat([entry])))
                .reduce((subResults, result) => subResults.concat(result), []),
        [[]],
    );
}
