import React from 'react';
import { BitVector } from '../logic/BitVector';
import { Logic } from '../logic/Logic';
import './RequirementsTooltip.css';
import { cloneElement } from 'react';
import BooleanExpression from '../newApp/BooleanExpression';

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
                <Expr
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

function Expr({
    expr,
    logic,
    inventoryBits,
}: {
    expr: BooleanExpression;
    logic: Logic;
    inventoryBits: BitVector;
}): JSX.Element {
    return (
        <>
            {addDividers(
                expr.items.map((val, idx) =>
                    typeof val === 'object' ? (
                        <React.Fragment key={idx}>
                            {'('}
                            <Expr
                                expr={val}
                                inventoryBits={inventoryBits}
                                logic={logic}
                            />
                            {')'}
                        </React.Fragment>
                    ) : (
                        <span
                            key={idx}
                            className={
                                inventoryBits.test(logic.items[val][1]) ? 'met' : 'unmet'
                            }
                        >
                            {val}
                        </span>
                    ),
                ),
                <>{` ${expr.type} `}</>,
            )}
        </>
    );
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
