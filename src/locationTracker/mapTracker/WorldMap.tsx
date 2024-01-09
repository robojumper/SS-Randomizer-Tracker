import { Row, Col } from 'react-bootstrap';
import skyMap from '../../assets/maps/Sky.png';
import faronMap from '../../assets/maps/Faron.png';
import eldinMap from '../../assets/maps/Eldin.png';
import lanayruMap from '../../assets/maps/Lanayru.png';
import skyloftMap from '../../assets/maps/Skyloft.png';
import MapMarker from './MapMarker';
import LocationGroup from '../LocationGroup';
import Submap, { EntranceMarkerParams } from './Submap';
import mapData from '../../data/mapData.json';
import LocationContextMenu from '../LocationContextMenu';
import LocationGroupContextMenu from '../LocationGroupContextMenu';
import { areasSelector } from '../../tracker/selectors';
import { useSelector } from 'react-redux';

type WorldMapProps = {
    imgWidth: number,
    handleGroupClick: (group: string | undefined) => void
    handleSubmapClick: (submap: string | undefined) => void,
    containerHeight: number,
    expandedGroup: string | undefined,
    activeSubmap: string | undefined,
};

const images: Record<string, string> = {
    skyloftMap,
    faronMap,
    eldinMap,
    lanayruMap,
};

const WorldMap = (props: WorldMapProps) => {
    const { containerHeight, activeSubmap, expandedGroup, handleGroupClick, handleSubmapClick } = props;
    let { imgWidth } = props;
    // original image dimensions
    const aspectRatio = 843/465;
    let imgHeight = imgWidth / aspectRatio;
    if (imgHeight > containerHeight * 0.55) {
        imgHeight = containerHeight * 0.55;
        imgWidth = imgHeight * aspectRatio;
    }
    const {
        skyloftSubmap,
        faronSubmap,
        eldinSubmap,
        lanayruSubmap,
        thunderhead,
        sky,
    } = mapData;

    const submaps = [
        faronSubmap,
        skyloftSubmap,
        eldinSubmap,
        lanayruSubmap,
    ];

    const markers = [
        thunderhead,
        sky,
    ];

    const worldMap = (
        <div style={{position:'absolute', width:imgWidth, height:imgWidth / aspectRatio}}>
            <div>
                {!activeSubmap &&
                    <img src={skyMap} alt="World Map" width={imgWidth}/>
                }
                {markers.map((marker) => (
                    <div key={marker.region} style={{display:(!activeSubmap ? '' : 'none')}}>
                        <MapMarker
                            markerX={marker.markerX}
                            markerY={marker.markerY}
                            title={marker.region}
                            onGlickGroup={handleGroupClick}
                            mapWidth={imgWidth}
                            expandedGroup={expandedGroup}
                        />
                    </div>
                ))}
                {submaps.map((submap) => (
                    <Submap
                        key={submap.name}
                        markerX={submap.markerX}
                        markerY={submap.markerY}
                        title={submap.name}
                        onGroupChange={handleGroupClick}
                        onSubmapChange={handleSubmapClick}
                        markers={submap.markers}
                        entranceMarkers={submap.entranceMarkers as EntranceMarkerParams[]}
                        map={images[submap.map]}
                        mapWidth={imgWidth}
                        exitParams={submap.exitParams}
                        expandedGroup={expandedGroup}
                        activeSubmap={activeSubmap}
                    />
                ))}
            </div>
            <LocationContextMenu />
            <LocationGroupContextMenu />
        </div>
    );

    const areas = useSelector(areasSelector);

    const selectedArea = expandedGroup && areas.find((a) => a.name === expandedGroup) || undefined;
    
    const locationList = (
        <div style={{position:'relative', top: imgHeight * 1.1 + 30, display:'flex'}}>
            {
                selectedArea && (
                    <Col>
                        <Row style={{ width: imgWidth, height: containerHeight * 0.35, overflowY: 'scroll', overflowX: 'visible' }}>
                            <LocationGroup
                                locations={selectedArea.checks}
                            />
                        </Row>
                    </Col>
                )
            }
        </div>
    );


    return (
        <div>
            {worldMap}
            {locationList}
        </div>
    );
}

export default WorldMap;
