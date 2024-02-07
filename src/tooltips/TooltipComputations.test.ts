import { BitVector } from '../logic/bitlogic/BitVector';
import { LogicalExpression } from '../logic/bitlogic/LogicalExpression';
import { algebraicDivision, findKernels } from './TooltipComputations';

test('algebraicDivision', () => {
    const f = ['h', 'ax', 'bx', 'cx', 'ay', 'by', 'cy'];
    const d = ['a', 'b', 'c'];
    let domainSize = -1;
    for (const str of f.concat(d).join('')) {
        const c = str.charCodeAt(0);
        if (c > domainSize) {
            domainSize = c;
        }
    }
    domainSize += 1;

    const fv = f.map((term) => {
        const vec = new BitVector();
        for (const chr of term) {
            vec.setBit(chr.charCodeAt(0));
        }
        return vec;
    });

    const dv = d.map((term) => {
        const vec = new BitVector();
        for (const chr of term) {
            vec.setBit(chr.charCodeAt(0));
        }
        return vec;
    });

    const result = algebraicDivision(fv, dv);
    const res = new LogicalExpression(result.quotient)
        .removeDuplicates()
        .conjunctions.map((conj) =>
            [...conj.iter()].map((b) => String.fromCharCode(b)),
        );
    const rem = new LogicalExpression(result.remainder)
        .removeDuplicates()
        .conjunctions.map((conj) =>
            [...conj.iter()].map((b) => String.fromCharCode(b)),
        );
    expect([rem, res]).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "h",
            ],
          ],
          Array [
            Array [
              "x",
            ],
            Array [
              "y",
            ],
          ],
        ]
    `);
});

test('findKernels', () => {
    const f = ['ace', 'bce', 'de', 'g'];
    let domainSize = -1;
    const variables = new Set<number>();
    for (const str of f.join('')) {
        const c = str.charCodeAt(0);
        variables.add(c);
        if (c > domainSize) {
            domainSize = c;
        }
    }
    domainSize += 1;

    const fv = f.map((term) => {
        const vec = new BitVector();
        for (const chr of term) {
            vec.setBit(chr.charCodeAt(0));
        }
        return vec;
    });

    const result = findKernels(fv, [...variables], new BitVector());
    expect(
        result.map(({ kernel, coKernel }) => ({
            kernel: kernel.map((t) =>
                [...t.iter()].map((b) => String.fromCharCode(b)),
            ),

            coKernel: [...coKernel.iter()].map((b) => String.fromCharCode(b)),
        })),
    ).toMatchInlineSnapshot(`
        Array [
          Object {
            "coKernel": Array [
              "c",
              "e",
            ],
            "kernel": Array [
              Array [
                "a",
              ],
              Array [
                "b",
              ],
            ],
          },
          Object {
            "coKernel": Array [
              "e",
            ],
            "kernel": Array [
              Array [
                "a",
                "c",
              ],
              Array [
                "b",
                "c",
              ],
              Array [
                "d",
              ],
            ],
          },
          Object {
            "coKernel": Array [],
            "kernel": Array [
              Array [
                "a",
                "c",
                "e",
              ],
              Array [
                "b",
                "c",
                "e",
              ],
              Array [
                "d",
                "e",
              ],
              Array [
                "g",
              ],
            ],
          },
        ]
    `);
});

test('findKernels2', () => {
    const f = ['wb', 'g', 'sw'];
    let domainSize = -1;
    const variables = new Set<number>();
    for (const str of f.join('')) {
        const c = str.charCodeAt(0);
        variables.add(c);
        if (c > domainSize) {
            domainSize = c;
        }
    }
    domainSize += 1;

    const fv = f.map((term) => {
        const vec = new BitVector();
        for (const chr of term) {
            vec.setBit(chr.charCodeAt(0));
        }
        return vec;
    });

    const result = findKernels(fv, [...variables], new BitVector());
    expect(
        result.map(({ kernel, coKernel }) => ({
            kernel: kernel.map((t) =>
                [...t.iter()].map((b) => String.fromCharCode(b)),
            ),

            coKernel: [...coKernel.iter()].map((b) => String.fromCharCode(b)),
        })),
    ).toMatchInlineSnapshot(`
        Array [
          Object {
            "coKernel": Array [
              "w",
            ],
            "kernel": Array [
              Array [
                "b",
              ],
              Array [
                "s",
              ],
            ],
          },
          Object {
            "coKernel": Array [],
            "kernel": Array [
              Array [
                "w",
                "b",
              ],
              Array [
                "g",
              ],
              Array [
                "s",
                "w",
              ],
            ],
          },
        ]
    `);
});

test('findKernels2', () => {
    const f = [
        'abef',
        'abegh',
        'acf',
        'acg',
        'abfi',
        'def',
        'deg',
        'dfj',
        'dgj',
        'abghi',
        'adg',
        'adf',
    ];
    let domainSize = -1;
    const variables = new Set<number>();
    for (const str of f.join('')) {
        const c = str.charCodeAt(0);
        variables.add(c);
        if (c > domainSize) {
            domainSize = c;
        }
    }
    domainSize += 1;

    const fv = f.map((term) => {
        const vec = new BitVector();
        for (const chr of term) {
            vec.setBit(chr.charCodeAt(0));
        }
        return vec;
    });

    const result = findKernels(fv, [...variables], new BitVector());
    expect(
        result.map(({ kernel, coKernel }) => ({
            kernel: kernel.map((t) =>
                [...t.iter()].map((b) => String.fromCharCode(b)),
            ),

            coKernel: [...coKernel.iter()].map((b) => String.fromCharCode(b)),
        })),
    ).toMatchInlineSnapshot(`
        Array [
          Object {
            "coKernel": Array [
              "a",
            ],
            "kernel": Array [
              Array [
                "b",
                "e",
                "f",
              ],
              Array [
                "b",
                "e",
                "g",
                "h",
              ],
              Array [
                "c",
                "f",
              ],
              Array [
                "c",
                "g",
              ],
              Array [
                "b",
                "f",
                "i",
              ],
              Array [
                "b",
                "g",
                "h",
                "i",
              ],
              Array [
                "d",
                "g",
              ],
              Array [
                "d",
                "f",
              ],
            ],
          },
          Object {
            "coKernel": Array [
              "e",
            ],
            "kernel": Array [
              Array [
                "a",
                "b",
                "f",
              ],
              Array [
                "a",
                "b",
                "g",
                "h",
              ],
              Array [
                "d",
                "f",
              ],
              Array [
                "d",
                "g",
              ],
            ],
          },
          Object {
            "coKernel": Array [
              "f",
            ],
            "kernel": Array [
              Array [
                "a",
                "b",
                "e",
              ],
              Array [
                "a",
                "c",
              ],
              Array [
                "a",
                "b",
                "i",
              ],
              Array [
                "d",
                "e",
              ],
              Array [
                "d",
                "j",
              ],
              Array [
                "a",
                "d",
              ],
            ],
          },
          Object {
            "coKernel": Array [
              "g",
            ],
            "kernel": Array [
              Array [
                "a",
                "b",
                "e",
                "h",
              ],
              Array [
                "a",
                "c",
              ],
              Array [
                "d",
                "e",
              ],
              Array [
                "d",
                "j",
              ],
              Array [
                "a",
                "b",
                "h",
                "i",
              ],
              Array [
                "a",
                "d",
              ],
            ],
          },
          Object {
            "coKernel": Array [
              "d",
            ],
            "kernel": Array [
              Array [
                "e",
                "f",
              ],
              Array [
                "e",
                "g",
              ],
              Array [
                "f",
                "j",
              ],
              Array [
                "g",
                "j",
              ],
              Array [
                "a",
                "g",
              ],
              Array [
                "a",
                "f",
              ],
            ],
          },
          Object {
            "coKernel": Array [],
            "kernel": Array [
              Array [
                "a",
                "b",
                "e",
                "f",
              ],
              Array [
                "a",
                "b",
                "e",
                "g",
                "h",
              ],
              Array [
                "a",
                "c",
                "f",
              ],
              Array [
                "a",
                "c",
                "g",
              ],
              Array [
                "a",
                "b",
                "f",
                "i",
              ],
              Array [
                "d",
                "e",
                "f",
              ],
              Array [
                "d",
                "e",
                "g",
              ],
              Array [
                "d",
                "f",
                "j",
              ],
              Array [
                "d",
                "g",
                "j",
              ],
              Array [
                "a",
                "b",
                "g",
                "h",
                "i",
              ],
              Array [
                "a",
                "d",
                "g",
              ],
              Array [
                "a",
                "d",
                "f",
              ],
            ],
          },
        ]
    `);
});

test('algebraicDivision2', () => {
    const f = [
        'abef',
        'abegh',
        'acf',
        'acg',
        'abfi',
        'def',
        'deg',
        'dfj',
        'dgj',
        'abghi',
        'adg',
        'adf',
    ];
    const d = ['a', 'd'];
    let domainSize = -1;
    for (const str of f.concat(d).join('')) {
        const c = str.charCodeAt(0);
        if (c > domainSize) {
            domainSize = c;
        }
    }
    domainSize += 1;

    const fv = f.map((term) => {
        const vec = new BitVector();
        for (const chr of term) {
            vec.setBit(chr.charCodeAt(0));
        }
        return vec;
    });

    const dv = d.map((term) => {
        const vec = new BitVector();
        for (const chr of term) {
            vec.setBit(chr.charCodeAt(0));
        }
        return vec;
    });

    const result = algebraicDivision(fv, dv);
    const res = new LogicalExpression(result.quotient)
        .removeDuplicates()
        .conjunctions.map((conj) =>
            [...conj.iter()].map((b) => String.fromCharCode(b)),
        );
    const rem = new LogicalExpression(result.remainder)
        .removeDuplicates()
        .conjunctions.map((conj) =>
            [...conj.iter()].map((b) => String.fromCharCode(b)),
        );
    expect([rem, res]).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "a",
              "b",
              "e",
              "f",
            ],
            Array [
              "a",
              "b",
              "e",
              "g",
              "h",
            ],
            Array [
              "a",
              "c",
              "f",
            ],
            Array [
              "a",
              "c",
              "g",
            ],
            Array [
              "a",
              "b",
              "f",
              "i",
            ],
            Array [
              "d",
              "e",
              "f",
            ],
            Array [
              "d",
              "e",
              "g",
            ],
            Array [
              "d",
              "f",
              "j",
            ],
            Array [
              "d",
              "g",
              "j",
            ],
            Array [
              "a",
              "b",
              "g",
              "h",
              "i",
            ],
            Array [
              "a",
              "d",
              "g",
            ],
            Array [
              "a",
              "d",
              "f",
            ],
          ],
          Array [],
        ]
    `);
});
