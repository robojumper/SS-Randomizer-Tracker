import _ from 'lodash';
import {
    bottomUpTooltipPropagation,
    // computeGroundExpression,
    // findNewSubgoals,
    removeDuplicates,
    shallowSimplify,
    // unifyRequirements,
} from '../../logic/bitlogic/BitLogic';
import { BitVector } from '../../logic/bitlogic/BitVector';
import { LogicalExpression } from '../../logic/bitlogic/LogicalExpression';
import {
    deserializeLogicalExpression,
    serializeBooleanExpression,
} from './Utils';
import { LeanLogic, WorkerRequest, WorkerResponse } from './Types';
import BooleanExpression, {
    Item,
} from '../../logic/booleanlogic/BooleanExpression';

/**
 * This module contains various strategies to turn the requirements into a more compact and readable
 * form, with the goal of creating readable and understandable requirements for tooltips.
 */

/**
 * Global application state. Will be initialized with the first message.
 */
interface GlobalState {
    logic: LeanLogic;
    opaqueBits: BitVector;
    learned: Set<number>;
    requirements: LogicalExpression[];
}

let g: GlobalState;

console.log('Hello from worker!');

onmessage = (ev: MessageEvent<WorkerRequest>) => {
    const start = performance.now();
    switch (ev.data.type) {
        case 'initialize': {
            const opaqueBits = new BitVector();
            for (const bit of ev.data.opaqueBits) {
                opaqueBits.setBit(bit);
            }
            g = {
                logic: ev.data.logic,
                opaqueBits,
                learned: new Set(),
                requirements: ev.data.requirements.map(
                    deserializeLogicalExpression,
                ),
            };

            do {
                // First, perform some cheap optimizations that will help every
                // query afterwards.
                removeDuplicates(g.requirements);
                while (shallowSimplify(g.opaqueBits, g.requirements)) {
                    removeDuplicates(g.requirements);
                }
            // eslint-disable-next-line no-constant-condition
            } while (/* unifyRequirements(g.opaqueBits, g.requirements) */ false);
            console.log('worker', 'initializing and pre-simplifying took', performance.now() - start, 'ms');

            const start2 = performance.now();
            bottomUpTooltipPropagation(g.opaqueBits, g.requirements);
            console.log('worker', 'fixpoint propagation tool', performance.now() - start2, 'ms');

            break;
        }
        case 'analyze': {
            if (!g) {
                throw new Error('needs to be initialized first!!!!');
            }
            const expr = analyze(ev.data.checkId);
            console.log('worker', 'total time for', ev.data.checkId, 'was', performance.now() - start, 'ms');
            postMessage({
                checkId: ev.data.checkId,
                expression: serializeBooleanExpression(expr),
            } satisfies WorkerResponse);
        }
    }
};

function analyze(checkId: string): BooleanExpression {
    const bit = g.logic.itemBits[checkId];

    /*
    // We precompute ("learn") some subgoals because it improves performance.
    // However, we can sometimes end up precomputing trivial requirements
    // like \Distance Activator for X Rupee items while expensive requirements
    // like \Can Medium Rupee Farm end up being not "learned" yet. So
    // we always perform a minimum amount of work per item.
    let numLearnedInPrecomputation = 0;
    while (numLearnedInPrecomputation < 5) {
        const potentialPath = findNewSubgoals(
            g.opaqueBits,
            g.requirements,
            bit,
            g.learned,
        );

        if (potentialPath && !potentialPath.isEmpty()) {
            for (const precomputeBit of potentialPath.iter()) {
                if (
                    !g.opaqueBits.test(precomputeBit) &&
                    !g.learned.has(precomputeBit)
                ) {
                    // And then precompute some non-opaque requirements. This persists between tooltips, so
                    // different checks can reuse these results.
                    // Note that even though the result of `findNewSubgoals` is obviously path-dependent and depends on the check in question,
                    // this particular call happens in isolation and has no dependencies on the check in question, so reusing is sound!
                    const start = performance.now();
                    g.requirements[precomputeBit] = computeGroundExpression(
                        g.opaqueBits,
                        g.requirements,
                        precomputeBit,
                    );
                    console.log('  ', 'worker', 'precomputing', g.logic.allItems[precomputeBit], 'took', performance.now() - start, 'ms');
                    g.learned.add(precomputeBit);
                    numLearnedInPrecomputation += 1;
                }
            }
        } else {
            // There are no subgoals to learn, so we can go straight to computing the goal.
            break;
        }
    }

    const start = performance.now();
    const opaqueOnlyExpr = computeGroundExpression(
        g.opaqueBits,
        g.requirements,
        bit,
    );
    console.log('  ', 'worker', 'computing', g.logic.allItems[bit], 'took', performance.now() - start, 'ms');
    g.requirements[bit] = opaqueOnlyExpr;
    */

    const opaqueOnlyExpr = g.requirements[bit];

    const simplifyStart = performance.now();
    const simplified = dnfToRequirementExpr(g.logic, opaqueOnlyExpr.conjunctions);
    console.log('  ', 'worker', 'simplifying took', performance.now() - simplifyStart, 'ms');
    return simplified;
}

function simplifier(logic: LeanLogic) {
    return (a: string, b: string) => {
        return a === b || Boolean(logic.impliedBy[b]?.includes(a));
    };
}

/**
 * Converts a DNF to a readable requirements expression.
 *
 * Our DNF is a sum of products (SOP) with no negations and no don't-cares.
 * As a result, standard two-level simplification algorithms (Quine-McCluskey/Karnaugh Maps)
 * will not produce any simplifications.
 *
 * Instead, we are doing multi-level simplification as described in:
 * https://faculty.sist.shanghaitech.edu.cn/faculty/zhoupq/Teaching/Spr16/07-Multi-Level-Logic-Synthesis.pdf
 * https://www2.eecs.berkeley.edu/Pubs/TechRpts/1989/ERL-89-49.pdf (pp. 41-70)
 * We first remove all factors, and then treat the rest SOP as an algebraic expression.
 * Algebraic expressions don't know about special boolean rules (like a && !a = 0, a || !a = 1)
 * but since we don't have any don't cares and negations they will never be relevant.
 */
export function dnfToRequirementExpr(
    logic: LeanLogic,
    sop: BitVector[],
): BooleanExpression {
    if (sop.length === 0) {
        return BooleanExpression.or();
    }

    if (sop.length === 1 && sop[0].isEmpty()) {
        return BooleanExpression.and();
    }

    /*
    return BooleanExpression.or(
        ...sop.map((s) =>
            BooleanExpression.and(
                ...[...s.iter()].map((bit) => logic.allItems[bit]),
            ),
        ),
    );
    */

    if (sop.length === 1) {
        return BooleanExpression.and(
            ...[...sop[0].iter()].map((x) => logic.allItems[x]),
        ).simplify(simplifier(logic));
    }

    const conjunctions = new LogicalExpression(sop).removeDuplicates()
        .conjunctions;

    // After removing duplicates, remove dominated stuff from our terms so that
    // simplification doesn't get funny ideas like pulling out irrelevant terms
    // that we later can't easily simplify in a multi level form.
    for (const conj of conjunctions) {
        for (const bit of [...conj.iter()]) {
            for (const dominator of logic.impliedBy[logic.allItems[bit]] ?? []) {
                const dominatorBit = logic.itemBits[dominator];
                if (dominatorBit !== bit && conj.test(dominatorBit)) {
                    conj.clearBit(bit);
                }
            }
        }
    }

    // First, remove all common factors and from our SOP so that it's "cube-free".
    // This is a requirement for the algorithm to work, as per the presentation.
    let commonFactors = new Set<number>(conjunctions[0].iter());
    for (const conj of conjunctions) {
        commonFactors = new Set(
            // eslint-disable-next-line no-loop-func
            [...conj.iter()].filter((b) => commonFactors.has(b)),
        );
    }

    // Build a list of all variables mentioned in this expression.
    const variables = new Set<number>();

    for (const conj of conjunctions) {
        for (const bit of commonFactors) {
            conj.clearBit(bit);
        }
        for (const bit of conj.iter()) {
            variables.add(bit);
        }
    }

    // At this point it's best to just consult the lecture presentation for why this is happening.
    const kernels = findKernels(
        conjunctions,
        [...variables],
        new BitVector(),
    ).filter((k) => !k.coKernel.isEmpty());

    // Columns are all unique cubes in all kernels
    const columns = kernels.reduce<BitVector[]>((acc, kernel) => {
        for (const kCube of kernel.kernel) {
            if (!acc.some((cube) => kCube.equals(cube))) {
                acc.push(kCube);
            }
        }
        return acc;
    }, []);

    // Rows are labelled with all unique co-kernels.
    const rows = kernels;

    if (rows.length > 0 && columns.length > 0) {
        // Create a matrix with ones in places where column cube appears in row kernel.
        const matrix = Array<(0 | 1)[]>(rows.length)
            .fill([])
            .map(() => Array<0 | 1>(columns.length).fill(0));
        for (const [col, kernelCube] of columns.entries()) {
            for (const [row, coKernel] of rows.entries()) {
                if (coKernel.kernel.some((kCube) => kCube.equals(kernelCube))) {
                    matrix[row][col] = 1;
                }
            }
        }

        // Again look at the lecture presentation here.
        const rowWeight = (row: number) => rows[row].coKernel.numSetBits + 1;
        const colWeight = (col: number) => columns[col].numSetBits;
        const value = (col: number, row: number) =>
            rows[row].coKernel.or(columns[col]).numSetBits;

        const literalsSaved = (rectRows: number[], rectCols: number[]) =>
            _.sumBy(rectRows, (row) =>
                _.sumBy(rectCols, (col) =>
                    matrix[row][col] ? value(col, row) : 0,
                ),
            ) -
            _.sumBy(rectRows, rowWeight) -
            _.sumBy(rectCols, colWeight);

        // This is the thesis algorithm for enumerating all prime rectangles.
        // Theoretically the algorithm is branch-and-bound, but our problems
        // are small enough for branch to be enough.
        const allRects: [number[], number[]][] = [];
        genRectangles(
            rows.map((_val, idx) => idx),
            columns.map((_val, idx) => idx),
            matrix,
            (rows, cols) => {
                allRects.push([rows, cols]);
                // No bound.
                return true;
            },
        );

        if (allRects.length) {
            const [, rectCols] = _.maxBy(allRects, ([rows, cols]) =>
                literalsSaved(rows, cols),
            )!;

            const divisor = rectCols.map((col) => columns[col]);
            // console.log('would extract:', divisor.map((val) => [...val.iter()].map((bit) => logic.allItems[bit]).join('&')).join(' + '));
            // console.log('original expression:', conjunctions.map((val) => [...val.iter()].map((bit) => logic.allItems[bit]).join('&')).join(' + '));
            // const divTimer = performance.now();
            const { quotient, remainder } = algebraicDivision(
                conjunctions,
                divisor,
            );
            // console.log(`algebraic division took`, performance.now() - divTimer, 'ms');

            // Recursively simplify the quotient, divisor and remainder (divisor probably doesn't need to be...)

            const optQuotient = new LogicalExpression(
                quotient,
            ).removeDuplicates();
            const andTerms: Item[] = [...commonFactors].map(
                (f) => logic.allItems[f],
            );
            const product = BooleanExpression.and(
                dnfToRequirementExpr(logic, optQuotient.conjunctions),
                dnfToRequirementExpr(logic, divisor),
            );
            const sum = BooleanExpression.or(
                product,
                dnfToRequirementExpr(logic, remainder),
            );

            // CommonFactor1 and CommonFactor2 and (Quotient and Divisor or Remainder)
            return BooleanExpression.and(...andTerms, sum).simplify(
                simplifier(logic),
            );
        }
    }

    // CommonFactor1 and CommonFactor2 and (SOPWithoutCommonFactors)
    return BooleanExpression.and(
        ...[...commonFactors].map((i) => logic.allItems[i]),
        BooleanExpression.or(
            ...conjunctions.map((c) => bitVecToRequirements(logic, c)),
        ),
    ).simplify(simplifier(logic));
}

function genRectangles(
    allRows: number[],
    allCols: number[],
    matrix: (0 | 1)[][],
    callback: (rows: number[], cols: number[]) => boolean,
) {
    // Trivial rectangles are rectangles of height 1 or width 1.
    // A trivial row rectangle is *prime* if no other row
    // has ones everywhere we have ones. Expressed differently:
    // We're prime if there is no such other row that for every column,
    // "our row has a 1" implies "other row has a 1" (and by A=>B <=> Bv!A)
    for (const row of allRows) {
        const ones = allCols.filter((col) => matrix[row][col]);
        if (
            ones.length &&
            !allRows.some(
                (otherRow) =>
                    otherRow !== row &&
                    allCols.every(
                        (otherCol) =>
                            !ones.includes(otherCol) ||
                            matrix[otherRow][otherCol],
                    ),
            )
        ) {
            callback([row], ones);
        }
    }

    for (const col of allCols) {
        const ones = allRows.filter((row) => matrix[row][col]);
        if (
            ones.length &&
            !allCols.some(
                (otherCol) =>
                    otherCol !== col &&
                    allRows.every(
                        (otherRow) =>
                            !ones.includes(otherRow) ||
                            matrix[otherRow][otherCol],
                    ),
            )
        ) {
            callback(ones, [col]);
        }
    }
    genRectanglesRecursive(allRows, allCols, matrix, 0, [], [], callback);
}

function genRectanglesRecursive(
    allRows: number[],
    allCols: number[],
    matrix: (0 | 1)[][],
    index: number,
    // The paper doesn't use this?
    _rectRows: number[],
    rectCols: number[],
    callback: (rows: number[], cols: number[]) => boolean,
) {
    for (const c of allCols) {
        if (c >= index && allRows.filter((row) => matrix[row][c]).length >= 2) {
            // create M1 with rows 0 where c is 0 and rows intact where c is 1
            const m1 = matrix.map((row, rowIndex) =>
                matrix[rowIndex][c] ? row.slice() : row.map(() => 0 as const),
            );
            const rect1Rows = allRows.filter((row) => matrix[row][c]);
            const rect1Cols = rectCols.slice();

            let prune = false;
            for (const c1 of allCols) {
                if (
                    allRows.filter((row) => m1[row][c1]).length ===
                    allRows.filter((row) => matrix[row][c]).length
                ) {
                    if (c1 < c) {
                        prune = true;
                        break;
                    } else {
                        rect1Cols.push(c1);
                        for (const row of allRows) {
                            m1[row][c1] = 0;
                        }
                    }
                }
            }

            if (!prune) {
                const bound = callback(rect1Rows, rect1Cols);
                if (!bound) {
                    genRectanglesRecursive(
                        allRows,
                        allCols,
                        m1,
                        c,
                        rect1Rows,
                        rect1Cols,
                        callback,
                    );
                }
            }
        }
    }
}

function findKernels(
    cubes: BitVector[],
    variables: number[],
    coKernelPath: BitVector,
    seenCoKernels: BitVector[] = [],
    minIdx = 0,
): { kernel: BitVector[]; coKernel: BitVector }[] {
    const kernels = [];
    for (const [idx, bit] of variables.entries()) {
        if (idx < minIdx) {
            continue;
        }
        const s = cubes.filter((c) => c.test(bit));
        if (s.length >= 2) {
            const co = s.reduce((acc, c) => acc.and(c), s[0]);
            const subPath = coKernelPath.or(co);
            const quot = algebraicDivision(cubes, [co]).quotient;
            const subKernels = findKernels(
                quot,
                variables,
                subPath,
                seenCoKernels,
                idx + 1,
            );
            for (const sub of subKernels) {
                if (
                    !seenCoKernels.some((seenCo) => seenCo.equals(sub.coKernel))
                ) {
                    seenCoKernels.push(sub.coKernel);
                    kernels.push(sub);
                }
            }
        }
    }

    if (!seenCoKernels.some((seenCo) => seenCo.equals(coKernelPath))) {
        kernels.push({
            kernel: cubes,
            coKernel: coKernelPath.clone(),
        });
    }

    return kernels;
}

function algebraicDivision(
    expr: BitVector[],
    divisor: BitVector[],
): { quotient: BitVector[]; remainder: BitVector[] } {
    let quotient: BitVector[] | undefined;
    for (const divCube of divisor) {
        const c = expr
            .filter((c) => divCube.isSubsetOf(c))
            .map((c) => c.clone());
        if (c.length === 0) {
            return { quotient: [], remainder: expr };
        }
        for (const ci of c) {
            for (const bit of divCube.iter()) {
                ci.clearBit(bit);
            }
        }
        if (!quotient) {
            quotient = c;
        } else {
            quotient = quotient.filter((qc) => c.some((cc) => cc.equals(qc)));
        }
    }

    const qd = new LogicalExpression(quotient!)
        .and(new LogicalExpression(divisor))
        .removeDuplicates();
    const remainder = expr.filter(
        (e) => !qd.conjunctions.some((qd) => qd.isSubsetOf(e)),
    );
    return { quotient: quotient!, remainder };
}

function bitVecToRequirements(
    logic: LeanLogic,
    vec: BitVector,
): BooleanExpression {
    return BooleanExpression.and(
        ...[...vec.iter()].map((x) => logic.allItems[x]),
    );
}
