import React from 'react';
import { BitVector } from '../logic/BitVector';
import { Logic } from '../logic/Logic';
import './RequirementsTooltip.css';
import { cloneElement } from 'react';
import BooleanExpression, { Op } from '../newApp/BooleanExpression';
import { Item } from '../logic/BooleanExpression';
import prettyItemNames_ from '../data/prettyItemNames.json';

const prettyItemNames: Record<
    string,
    Record<number, string>
> = prettyItemNames_;

export default function RequirementsTooltip({
    requirements,
    logic,
    inventoryBits,
}: {
    requirements: BooleanExpression | undefined;
    logic: Logic;
    inventoryBits: BitVector;
}) {
    return (
        <div>
            {requirements ? (
                <TopLevelExpr
                    expr={requirements}
                    logic={logic}
                    inventoryBits={inventoryBits}
                />
            ) : (
                'Loading...'
            )}
        </div>
    );
}

function TopLevelExpr({
    expr,
    logic,
    inventoryBits,
}: {
    expr: BooleanExpression;
    logic: Logic;
    inventoryBits: BitVector;
}) {
    if (expr.type === Op.And) {
        return (
            <>
                {expr.items.map((item, idx) => (
                    <li key={idx}>
                        <Expr
                            expr={item}
                            logic={logic}
                            inventoryBits={inventoryBits}
                            parentOp={undefined}
                        />
                    </li>
                ))}
            </>
        );
    } else {
        return (
            <li>
                <Expr
                    expr={expr}
                    logic={logic}
                    inventoryBits={inventoryBits}
                    parentOp={undefined}
                />
            </li>
        );
    }
}

function Expr({
    expr,
    logic,
    inventoryBits,
    parentOp,
}: {
    expr: Item;
    logic: Logic;
    inventoryBits: BitVector;
    parentOp: Op | undefined;
}): React.ReactElement {
    if (typeof expr === 'object') {
        return (
            <>
                {parentOp && '('}
                {addDividers(
                    expr.items.map((val, idx) => (
                        <Expr
                            key={idx}
                            expr={val}
                            logic={logic}
                            inventoryBits={inventoryBits}
                            parentOp={expr.type}
                        />
                    )),
                    <>{` ${expr.type} `}</>,
                )}
                {parentOp && ')'}
            </>
        );
    } else {
        return (
            <span
                className={
                    inventoryBits.test(logic.items[expr][1]) ? 'met' : 'unmet'
                }
            >
                <ItemName item={expr} />
            </span>
        );
    }
}

const itemCountPat = /^(.+) x (\d+)$/;

function ItemName({ item }: { item: string }) {

    if (item in prettyItemNames) {
        return <>{prettyItemNames[item][1]}</>;
    }

    const match = item.match(itemCountPat);
    if (match) {
        const [, baseName, count] = match;
        if (baseName in prettyItemNames) {
            const pretty = prettyItemNames[baseName][parseInt(count, 10)];
            if (pretty) {
                return <>{pretty}</>;
            }
        }
    }

    return <>{item}</>;
}

/** places a divider between each element of arr */
function addDividers<T extends React.ReactNode>(
    arr: T[],
    divider: React.ReactElement,
): React.ReactNode[] {
    return arr.flatMap((e, i) => [
        i ? cloneElement(divider, { key: `divider-${i}` }) : null,
        e,
    ]);
}
