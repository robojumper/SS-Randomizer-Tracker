import BooleanExpression, { Op } from './BooleanExpression';

test('flattenFalse', () => {
    const expr = new BooleanExpression([], Op.Or);

    expect(expr.flatten()).toMatchInlineSnapshot(`
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
