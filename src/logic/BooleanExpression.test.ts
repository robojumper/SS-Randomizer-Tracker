import _ from 'lodash';
import BooleanExpression from './BooleanExpression';
import LogicHelper from './LogicHelper';
import Logic from './Logic';

test('simplify', () => {
    const simplifiedNested = BooleanExpression.and(
        BooleanExpression.and('Nothing'),
    ).simplify(_.eq);
    expect(simplifiedNested).toMatchInlineSnapshot(`
        BooleanExpression {
          "items": Array [
            "Nothing",
          ],
          "type": "and",
        }
    `);
});

const mockLogic = (reqs: Record<string, string>): Logic =>
    ({
        getRequirement(req: string) {
            return reqs[req];
        },
    } as Logic);

test('simplify', () => {
    const reqs: Record<string, string> = {
        'Can Access A': 'Can Access B & Can Access B',
        'Can Access B': 'Bomb Bag',
    };
    LogicHelper.bindLogic(mockLogic(reqs));
    expect(LogicHelper.booleanExpressionForRequirements('Can Access A'))
        .toMatchInlineSnapshot(`
        BooleanExpression {
          "items": Array [
            BooleanExpression {
              "items": Array [
                BooleanExpression {
                  "items": Array [
                    "Bomb Bag",
                  ],
                  "type": "and",
                },
                BooleanExpression {
                  "items": Array [
                    "Bomb Bag",
                  ],
                  "type": "and",
                },
              ],
              "type": "and",
            },
          ],
          "type": "and",
        }
    `);
});
