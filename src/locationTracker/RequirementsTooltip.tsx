import React from 'react';
import './RequirementsTooltip.css';
import { cloneElement } from 'react';
import { Op } from '../logic/booleanlogic/BooleanExpression';
import { RootTooltipExpression, TooltipExpression } from '../tooltips/TooltipExpression';
import { useSelector } from 'react-redux';
import { colorSchemeSelector } from '../customization/selectors';

export default function RequirementsTooltip({
    requirements,
}: {
    requirements: RootTooltipExpression | undefined;
}) {
    return (
        <div>
            {requirements ? (
                <TopLevelExpr
                    expr={requirements}
                />
            ) : (
                'Loading...'
            )}
        </div>
    );
}

function TopLevelExpr({
    expr,
}: {
    expr: RootTooltipExpression;
}) {
    return (
        <>
            {expr.items.map((item, idx) => (
                <li key={idx}>
                    <Expr
                        expr={item}
                        parentOp={undefined}
                    />
                </li>
            ))}
        </>
    );
}

function Expr({
    expr,
    parentOp,
}: {
    expr: TooltipExpression;
    parentOp: Op | undefined;
}): React.ReactElement {
    const colorScheme = useSelector(colorSchemeSelector);
    if (expr.type === 'expr') {
        return (
            <>
                {parentOp && '('}
                {addDividers(
                    expr.items.map((val, idx) => (
                        <Expr
                            key={idx}
                            expr={val}
                            parentOp={expr.op}
                        />
                    )),
                    <>{` ${expr.op} `}</>,
                )}
                {parentOp && ')'}
            </>
        );
    } else {
        return (
            <span
                style={{
                    color: colorScheme[expr.logicalState],
                }}
            >
                {expr.item}
            </span>
        );
    }
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
