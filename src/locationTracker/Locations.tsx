import React from 'react';
import { useSelector } from 'react-redux';
import type { HintRegion } from '../logic/Locations';
import { settingSelector } from '../tracker/Selectors';
import { CrystalAmountsChooser } from './CrystalAmountsChooser';
import LocationGroup from './LocationGroup';

export function Locations({
    wide,
    hintRegion,
    onChooseEntrance,
}: {
    wide: boolean;
    hintRegion: HintRegion<string>;
    onChooseEntrance: (exitId: string) => void;
}) {
    const randomCrystals =
        useSelector(settingSelector('batreaux-counts')) === 'Random';
    return (
        <>
            {randomCrystals && hintRegion.name === "Batreaux's House" && (
                <>
                    <CrystalAmountsChooser />
                    <hr />
                </>
            )}
            <LocationGroup
                wide={wide}
                onChooseEntrance={onChooseEntrance}
                locations={hintRegion.checks.list}
            />
            {(
                ['loose_crystal', 'tr_cube', 'gossip_stone', 'exits'] as const
            ).map(
                (type) =>
                    Boolean(hintRegion.extraLocations[type]?.list.length) && (
                        <React.Fragment key={type}>
                            <hr />
                            <LocationGroup
                                wide={wide}
                                onChooseEntrance={onChooseEntrance}
                                locations={
                                    hintRegion.extraLocations[type]!.list
                                }
                            />
                        </React.Fragment>
                    ),
            )}
        </>
    );
}
