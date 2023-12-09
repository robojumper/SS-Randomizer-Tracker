import BooleanExpression, { Op } from './BooleanExpression';

test('factorCommonSubterms', () => {
    const expr = new BooleanExpression(
        [
            new BooleanExpression(['Z', 'A'], Op.And),
            new BooleanExpression(['Z', 'B'], Op.And),
            new BooleanExpression(['Z', 'C'], Op.And),
            new BooleanExpression(['Z', 'D'], Op.And),
            'X',
        ],
        Op.Or,
    );

    expect(expr.factorCommonSubterms((a, b) => a === b)).toMatchInlineSnapshot(`
        BooleanExpression {
          "items": Array [
            BooleanExpression {
              "items": Array [
                "Z",
                BooleanExpression {
                  "items": Array [
                    "A",
                    "B",
                    "C",
                    "D",
                  ],
                  "type": "or",
                },
              ],
              "type": "and",
            },
            "X",
          ],
          "type": "or",
        }
    `);
});

test('flattenFalse', () => {
    const expr = new BooleanExpression([], Op.Or);

    expect(expr.flatten()).toMatchInlineSnapshot(`
        BooleanExpression {
          "items": Array [],
          "type": "or",
        }
    `);
});

test('factorCommonSubtermsFalse', () => {
    const expr = new BooleanExpression([], Op.Or);

    expect(expr.factorCommonSubterms((a, b) => a === b)).toMatchInlineSnapshot(`
              BooleanExpression {
                "items": Array [],
                "type": "or",
              }
      `);
});

test('removeDuplicateChildrenFalse', () => {
    const expr = new BooleanExpression([], Op.Or);

    expect(expr.removeDuplicateChildren((a, b) => a === b))
        .toMatchInlineSnapshot(`
        BooleanExpression {
          "items": Array [],
          "type": "or",
        }
    `);
});

test('flattenAnother', () => {
    const expr = new BooleanExpression(
        [new BooleanExpression([], Op.And)],
        Op.Or,
    );

    expect(expr.flatten()).toMatchInlineSnapshot(`
        BooleanExpression {
          "items": Array [],
          "type": "and",
        }
    `);
});
