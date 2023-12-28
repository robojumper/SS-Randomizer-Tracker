import React from 'react';
import { cloneElement } from 'react';

export default function PathTooltip({
    segments,
}: {
    segments: string[];
}) {
    return (
        <div>
            {addDividers(segments, <><br />→ </>)}
        </div>
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
