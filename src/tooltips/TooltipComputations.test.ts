/*
import { shuffle } from 'es-toolkit';
import {
    setEnabledSemilogicTricks,
    setTrickSemiLogic,
} from '../customization/Slice';
import type BooleanExpression from '../logic/booleanlogic/BooleanExpression';
import { itemMaxes, type InventoryItem } from '../logic/Inventory';
import { dungeonCompletionItems } from '../logic/TrackerModifications';
import { createTestLogic } from '../testing/TestingUtils';
import { logicSelector } from '../tracker/LogicInstanceSelector';
import {
    allSettingsSelector,
    checkSelector,
    exitsSelector,
    getRequirementLogicalStateSelector,
} from '../tracker/Selectors';
import { acceptSettings, setItemCounts } from '../tracker/Slice';
import { createTestLogic } from '../testing/TestingUtils';
import { logicSelector } from '../tracker/LogicInstanceSelector';
import {
    exitsSelector,
    getRequirementLogicalStateSelector,
} from '../tracker/Selectors';
import { allSettingsSelector } from '../tracker/SettingsSelector';
import { acceptSettings } from '../tracker/Slice';
import { TooltipComputer } from './TooltipComputations';
import {
    booleanExprToTooltipExpr,
    type RootTooltipExpression,
    type TooltipExpression,
} from './TooltipExpression';
import type { RecursiveTooltipRequirement2 } from './worker/BitIndex';

describe('tooltips', () => {
    const tester = createTestLogic();

    beforeAll(tester.initialize);

    function createComputer(): TooltipComputer {
        const logic = tester.readSelector(logicSelector);
        const exits = tester.readSelector(exitsSelector);

        return new TooltipComputer(logic, exits);
    }

    async function getTooltipExpression(
        computer: TooltipComputer,
        checkId: string,
    ): Promise<RootTooltipExpression> {
        let expr: RecursiveTooltipRequirement2 | undefined;
        expr = computer.getSnapshot(checkId);
        if (!expr) {
            let doResolve: (() => void) | undefined;
            const callback = () => {
                doResolve!();
            };
            let resultPromise = new Promise<void>((resolve) => {
                doResolve = resolve;
            });
            const unsubscribe = computer.subscribe(checkId, callback);
            expr = computer.getSnapshot(checkId);
            while (!expr) {
                // Results aren't available, so we need to await.
                await resultPromise;
                expr = computer.getSnapshot(checkId);
                if (expr) {
                    break;
                }
                resultPromise = new Promise<void>((resolve) => {
                    doResolve = resolve;
                });
            }
            unsubscribe();
            expect(expr).toBeDefined();
        }

        return booleanExprToTooltipExpr(
            tester.readSelector(logicSelector),
            expr,
            tester.readSelector(getRequirementLogicalStateSelector),
        );
    }

    function formatExpr(expr: TooltipExpression): string {
        if (expr.type === 'item') {
            return expr.item;
        } else {
            return `(${expr.items.map(formatExpr).join(` ${expr.op} `)})`;
        }
    }

    describe('basic checks', () => {
        let computer: TooltipComputer;
        beforeAll(() => {
            tester.reset();

            const settings = tester.readSelector(allSettingsSelector);
            tester.dispatch(
                acceptSettings({
                    settings: { ...settings, 'excluded-locations': [] },
                }),
            );
            computer = createComputer();
        });

        it.concurrent('computes Nothing', async ({ expect }) => {
            const result = await getTooltipExpression(
                computer,
                tester.findCheckId('Upper Skyloft', "Fledge's Gift"),
            );
            expect(formatExpr(result)).toMatchInlineSnapshot(`"(Nothing)"`);
        });

        it.concurrent('computes Batreaux', async ({ expect }) => {
            const result = await getTooltipExpression(
                computer,
                tester.findCheckId("Batreaux's House", '30 Crystals Chest'),
            );
            expect(formatExpr(result)).toMatchInlineSnapshot(
                `"(30 Gratitude Crystals)"`,
            );
        });

        it.concurrent(
            'computes more complicated things',
            async ({ expect }) => {
                const result = await getTooltipExpression(
                    computer,
                    tester.findCheckId('Lanayru Desert', 'Rescue Caged Robot'),
                );
                expect(formatExpr(result)).toMatchInlineSnapshot(
                    `"(Amber Tablet and (Bomb Bag or (Hook Beetle and (Bow or Practice Sword))))"`,
                );
            },
        );

        it.concurrent('computes goddess chest', async ({ expect }) => {
            const result = await getTooltipExpression(
                computer,
                tester.findCheckId(
                    'Sky',
                    "Cage\\Beedle's Island Cage Goddess Chest",
                ),
            );
            expect(formatExpr(result)).toMatchInlineSnapshot(
                `"(Goddess Cube on top of Skyview and (Beetle or Bow or Clawshots or Slingshot))"`,
            );
        });

        it.concurrent(
            'correctly factors out combinations',
            async ({ expect }) => {
                const result = await getTooltipExpression(
                    computer,
                    tester.findCheckId('Faron Woods', 'Deep Woods Chest'),
                );
                expect(formatExpr(result)).toMatchInlineSnapshot(
                    `"(Emerald Tablet and (Clawshots or ((Bomb Bag or Practice Sword) and (Beetle or Bow or Slingshot))))"`,
                );
            },
        );

        it.concurrent('shows no tricks by default', async ({ expect }) => {
            const result = await getTooltipExpression(
                computer,
                tester.findCheckId('Eldin Volcano', 'Digging Spot below Tower'),
            );
            expect(formatExpr(result)).toMatchInlineSnapshot(
                `"(Digging Mitts and Ruby Tablet and (Bow or Slingshot))"`,
            );
        });
    });

    describe('trick logic', () => {
        let computer: TooltipComputer;
        beforeAll(() => {
            tester.reset();

            const settings = tester.readSelector(allSettingsSelector);
            tester.dispatch(
                acceptSettings({
                    settings: { ...settings, 'excluded-locations': [] },
                }),
            );
            tester.dispatch(setTrickSemiLogic(true));
            tester.dispatch(setEnabledSemilogicTricks(['Stuttersprint']));
            computer = createComputer();
        });

        it.concurrent('shows tricks if asked', async ({ expect }) => {
            const result = await getTooltipExpression(
                computer,
                tester.findCheckId('Eldin Volcano', 'Digging Spot below Tower'),
            );
            expect(formatExpr(result)).toMatchInlineSnapshot(
                `"(Digging Mitts and Ruby Tablet and (Bow or Slingshot or Stuttersprint Trick))"`,
            );
        });
    });

    describe('logic state agrees with tooltips', () => {
        let computer: TooltipComputer;
        beforeAll(() => {
            tester.reset();

            const settings = tester.readSelector(allSettingsSelector);
            tester.dispatch(
                acceptSettings({
                    settings: {
                        ...settings,
                        'excluded-locations': [],
                        rupeesanity: true,
                        tadtonesanity: true,
                        shopsanity: true,
                    },
                }),
            );
            computer = createComputer();
        });

        it(
            'agrees',
            {
                timeout: 30000,
            },
            async ({ expect }) => {
                const tablets: InventoryItem[] = shuffle([
                    'Amber Tablet',
                    'Emerald Tablet',
                    'Ruby Tablet',
                ]);
                let itemPool: InventoryItem[] = [];
                for (const [item_, count] of Object.entries(itemMaxes)) {
                    const item = item_ as InventoryItem;
                    if (!tablets.includes(item)) {
                        for (let i = 0; i < count; i++) {
                            itemPool.push(item);
                        }
                    }
                }
                itemPool = shuffle(itemPool);
                // Insert tablets somewhere early
                itemPool.splice(2, 0, tablets[0]);
                itemPool.splice(7, 0, tablets[1]);
                itemPool.splice(14, 0, tablets[2]);

                const logic = tester.readSelector(logicSelector);

                const doCheck = async (
                    items: Partial<Record<InventoryItem, number>>,
                ) => {
                    tester.dispatch(
                        setItemCounts(
                            Object.entries(items).map(([item, count]) => ({
                                item: item as InventoryItem,
                                count,
                            })),
                        ),
                    );

                    const evaluate = (tooltip: TooltipExpression) => {
                        switch (tooltip.type) {
                            case 'item':
                                return tooltip.logicalState === 'inLogic';
                            case 'expr': {
                                switch (tooltip.op) {
                                    case 'and':
                                        return tooltip.items.every(evaluate);
                                    case 'or':
                                        return tooltip.items.some(evaluate);
                                }
                            }
                        }
                    };

                    for (const checkId of Object.keys(logic.locations)) {
                        if (dungeonCompletionItems['Sky Keep'] === checkId) {
                            continue;
                        }
                        const logicState = tester.readSelector(
                            checkSelector(checkId),
                        ).logicalState;
                        const tooltip = await getTooltipExpression(
                            computer,
                            checkId,
                        );
                        expect(logicState === 'inLogic', checkId).toEqual(
                            evaluate(tooltip),
                        );
                    }
                };

                const inventory: Partial<Record<InventoryItem, number>> = {};
                doCheck(inventory);

                while (itemPool.length) {
                    const item = itemPool.shift()!;
                    inventory[item] ??= 0;
                    inventory[item]++;
                    await doCheck(inventory);
                }
            },
        );
    });
});
*/
