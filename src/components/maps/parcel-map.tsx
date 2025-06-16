// src/components/maps/parcel-map.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon as LeafletPolygon, Tooltip as LeafletTooltip, GeoJSON, useMap, Marker, FeatureGroup } from 'react-leaflet';
import L, { LatLngBounds, LatLngBoundsExpression, LatLngExpression, LatLngTuple, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Importuri funcții TurfJS
import { union as turfUnion, centroid as turfCentroid, bbox as turfBbox, polygon as turfPolygonCreator } from '@turf/turf';

// Importuri Tipuri GeoJSON
import type { Feature, Polygon as GeoJsonPolygon, MultiPolygon as GeoJsonMultiPolygon, Position, GeoJsonProperties, Geometry } from 'geojson';

import { Parcel } from '@/services/parcels';
import { Farmer } from '@/services/farmers';
import { cn } from '@/lib/utils';

const GROUPING_ZOOM_LEVEL = 17;
const CADASTRAL_PREFIX_LENGTH = 7;
const MIN_PARCELS_FOR_GROUPING = 2; // Un grup se formează doar dacă are cel puțin X parcele

if (typeof window !== 'undefined') {
    if (L.Icon.Default.prototype && (L.Icon.Default.prototype as any)._getIconUrl) {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
    }
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
    });
}

export interface WGS84Coordinates extends Array<[number, number]> { }
interface ExtendedParcel extends Parcel { ownerColor?: string | null; cultivatorColor?: string | null; }
interface ParcelMapProps {
    parcels: ExtendedParcel[];
    farmers: Omit<Farmer, 'password'>[];
    selectedFarmerId?: string | null;
    highlightMode?: 'farmer' | 'parcel' | 'none';
    centerCoordinates?: LatLngTuple;
    initialZoom?: number;
    onParcelClick?: (parcelIdOrPrefix: string, isGroup?: boolean, groupDetails?: GroupedParcelBlock) => void;
    className?: string;
    readOnly?: boolean;
    selectedParcelIdsForHighlight?: string[];
    mapRef?: React.MutableRefObject<LeafletMap | null>;
}

const DEFAULT_CENTER: LatLngTuple = [47.0105, 28.8638];
const DEFAULT_ZOOM = 8;
const UNAUTHORED_PARCEL_COLOR = '#B0B0B0';
const UNAUTHORED_PARCEL_FILL_OPACITY = 0.15;
const GROUPED_BLOCK_STYLE = { fillColor: '#FFD700', color: '#FFA500', weight: 1, fillOpacity: 0.3 };

const ChangeView: React.FC<{ center: LatLngExpression; zoom: number; bounds?: LatLngBoundsExpression }> = ({ center, zoom, bounds }) => { const map = useMap(); useEffect(() => { if (bounds && bounds instanceof L.LatLngBounds && bounds.isValid()) { try { map.flyToBounds(bounds, { padding: [50, 50], duration: 0.5 }); } catch (e) { const validCenter: LatLngExpression = Array.isArray(center) && center.length === 2 ? center as LatLngTuple : DEFAULT_CENTER; map.setView(validCenter, zoom); } } else if (center) { const validCenter: LatLngExpression = Array.isArray(center) && center.length === 2 ? center as LatLngTuple : DEFAULT_CENTER; map.setView(validCenter, zoom); } }, [center, zoom, bounds, map]); return null; };
const MapEvents: React.FC<{ onZoomChange: (zoomLevel: number) => void }> = ({ onZoomChange }) => { const map = useMap(); useEffect(() => { const handleZoomEnd = () => { onZoomChange(map.getZoom()); }; map.on('zoomend', handleZoomEnd); onZoomChange(map.getZoom()); return () => { map.off('zoomend', handleZoomEnd); }; }, [map, onZoomChange]); return null; };

interface GroupedParcelBlock {
    id: string;
    geometry: Feature<GeoJsonPolygon | GeoJsonMultiPolygon>;
    center: LatLngTuple;
    count: number;
    parcelsInGroup: ExtendedParcel[];
    bounds: L.LatLngBounds;
}

// Presupunem că parcelCoordinates sunt [longitudine, latitudine]
function parcelToGeoJSONFeature(parcelCoordinates: WGS84Coordinates): Feature<GeoJsonPolygon> | null {
    if (!parcelCoordinates || !Array.isArray(parcelCoordinates) || parcelCoordinates.length < 3) return null;

    const linearRing: Position[] = parcelCoordinates.map(c => {
        // Asigurăm că fiecare coordonată este validă
        if (Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
            return [c[0], c[1]] as Position; // [lng, lat]
        }
        return null; // Marcam coordonata invalidă
    }).filter(c => c !== null) as Position[]; // Eliminăm coordonatele invalide

    if (linearRing.length < 3) return null; // Nu se poate forma un poligon

    // Închide poligonul dacă nu este deja închis
    if (linearRing.length > 0 && (linearRing[0][0] !== linearRing[linearRing.length - 1][0] || linearRing[0][1] !== linearRing[linearRing.length - 1][1])) {
        linearRing.push([...linearRing[0]]);
    }
    if (linearRing.length < 4) return null; // Un poligon GeoJSON valid necesită cel puțin 4 puncte (3 distincte + închidere)

    try {
        return turfPolygonCreator([linearRing]); // Creează un Feature<Polygon>
    } catch (error) {
        console.warn("Eroare la crearea poligonului TurfJS:", error, linearRing);
        return null;
    }
}


export const ParcelMap: React.FC<ParcelMapProps> = ({
    parcels, farmers, selectedFarmerId, highlightMode = 'none',
    centerCoordinates, initialZoom, onParcelClick, className,
    readOnly = true, selectedParcelIdsForHighlight, mapRef
}) => {
    const localMapRef = useRef<LeafletMap | null>(null);
    const setMapInstance = (map: LeafletMap | null) => { localMapRef.current = map; if (mapRef) mapRef.current = map; };

    const [internalCenter, setInternalCenter] = useState<LatLngTuple>(centerCoordinates || DEFAULT_CENTER);
    const [internalZoom, setInternalZoom] = useState<number>(initialZoom || DEFAULT_ZOOM);
    const [currentMapZoom, setCurrentMapZoom] = useState<number>(initialZoom || DEFAULT_ZOOM);
    const [mapBounds, setMapBounds] = useState<L.LatLngBounds | undefined>(undefined);

    useEffect(() => { if (parcels && parcels.length > 0) { const allValidCoords: LatLngTuple[] = parcels.flatMap(p => p.coordinates && Array.isArray(p.coordinates) ? p.coordinates.map(coordPair => [coordPair[1], coordPair[0]] as LatLngTuple) : []).filter(c => Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number'); if (allValidCoords.length > 0) { const bounds = L.latLngBounds(allValidCoords); if (bounds.isValid()) setMapBounds(bounds); else if (centerCoordinates) { setInternalCenter(centerCoordinates); setInternalZoom(initialZoom || DEFAULT_ZOOM); setMapBounds(undefined); } } else if (centerCoordinates) { setInternalCenter(centerCoordinates); setInternalZoom(initialZoom || DEFAULT_ZOOM); setMapBounds(undefined); } } else if (centerCoordinates) { setInternalCenter(centerCoordinates); setInternalZoom(initialZoom || DEFAULT_ZOOM); setMapBounds(undefined); } else { setInternalCenter(DEFAULT_CENTER); setInternalZoom(DEFAULT_ZOOM); setMapBounds(undefined); } }, [parcels, centerCoordinates, initialZoom]);
    const getParcelStyle = useCallback((parcel: ExtendedParcel, isGroupedMember: boolean = false) => { let fillColor = UNAUTHORED_PARCEL_COLOR; let fillOpacity = UNAUTHORED_PARCEL_FILL_OPACITY; let strokeColor = UNAUTHORED_PARCEL_COLOR; let weight = 1; const isHighlightedDirectly = selectedParcelIdsForHighlight?.includes(parcel.id); const ownerFarmer = parcel.ownerId ? farmers.find(f => f.id === parcel.ownerId) : null; const cultivatorFarmer = parcel.cultivatorId ? farmers.find(f => f.id === parcel.cultivatorId) : null; const ownerColor = ownerFarmer?.color; const cultivatorColor = cultivatorFarmer?.color; if (parcel.ownerId || parcel.cultivatorId) { fillColor = ownerColor || cultivatorColor || '#3388ff'; fillOpacity = 0.2; strokeColor = ownerColor || cultivatorColor || '#3388ff'; weight = 2; } if (highlightMode === 'farmer' && selectedFarmerId) { if (parcel.ownerId === selectedFarmerId && parcel.cultivatorId === selectedFarmerId) { fillColor = ownerColor || '#00FF00'; fillOpacity = 0.6; weight = 3; strokeColor = ownerColor || '#00AA00'; } else if (parcel.ownerId === selectedFarmerId) { fillColor = ownerColor || '#008000'; fillOpacity = 0.4; weight = 2.5; strokeColor = ownerColor || '#006400'; } else if (parcel.cultivatorId === selectedFarmerId) { fillColor = cultivatorColor || '#FFFF00'; fillOpacity = 0.5; weight = 2.5; strokeColor = cultivatorColor || '#CCCC00'; } else { if (!parcel.ownerId && !parcel.cultivatorId) { fillColor = UNAUTHORED_PARCEL_COLOR; fillOpacity = UNAUTHORED_PARCEL_FILL_OPACITY; strokeColor = UNAUTHORED_PARCEL_COLOR; weight = 1; } else { fillColor = ownerColor || cultivatorColor || '#A9A9A9'; fillOpacity = 0.15; strokeColor = ownerColor || cultivatorColor || '#808080'; weight = 1; } } } else if (isHighlightedDirectly) { fillColor = ownerColor || cultivatorColor || '#FF00FF'; fillOpacity = 0.7; weight = 3; strokeColor = ownerColor || cultivatorColor || '#DD00DD'; } return { fillColor, color: strokeColor, weight, opacity: 1, fillOpacity }; }, [farmers, selectedFarmerId, highlightMode, selectedParcelIdsForHighlight]);

    // CORECȚIE: handleParcelClickInternal primește obiectul parcel și eventLatLng
    const handleParcelClickInternal = (parcel: ExtendedParcel, eventLatLng: L.LatLng, isGroup: boolean = false, groupDetails?: GroupedParcelBlock) => {
        if (onParcelClick) {
            // Pentru grupuri, trimitem ID-ul grupului (prefixul)
            // Pentru parcele individuale, trimitem ID-ul parcelei
            onParcelClick(isGroup && groupDetails ? groupDetails.id : parcel.id, isGroup, groupDetails);
        }

        if (!isGroup && localMapRef.current && parcel.coordinates) { // Afișăm laturi doar pentru parcele individuale
            const map = localMapRef.current;
            const leafletPositions = parcel.coordinates
                .filter(c => Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number')
                .map(c => [c[1], c[0]] as LatLngTuple); // Convert [lng,lat] to [lat,lng]

            const sideLengths: string[] = [];
            if (leafletPositions.length >= 2) {
                for (let i = 0; i < leafletPositions.length; i++) {
                    const p1 = L.latLng(leafletPositions[i][0], leafletPositions[i][1]);
                    const p2 = L.latLng(leafletPositions[(i + 1) % leafletPositions.length][0], leafletPositions[(i + 1) % leafletPositions.length][1]);
                    const distance = map.distance(p1, p2);
                    sideLengths.push(`Latura ${i + 1}: ${distance.toFixed(2)} m`);
                }
            }

            const popupContent = `<div><b>Parcela: ${parcel.id}</b><br/><b>Suprafața:</b> ${parcel.area.toFixed(2)} ha<hr class="my-1"/><u>Laturi:</u><br/><ul style="list-style-type:none; padding-left:0; font-size:0.8em;">${sideLengths.map(s => `<li>${s}</li>`).join('') || "<li>Nu s-au putut calcula laturile.</li>"}</ul></div>`;
            L.popup().setLatLng(eventLatLng).setContent(popupContent).openOn(map);
        }
    };

    const groupedParcelBlocks = useMemo(() => {
        if (currentMapZoom < GROUPING_ZOOM_LEVEL || parcels.length < MIN_PARCELS_FOR_GROUPING) return [];
        const groups: Record<string, ExtendedParcel[]> = {};
        parcels.forEach(parcel => { /* ... (la fel) ... */ if (parcel.id && parcel.id.length >= CADASTRAL_PREFIX_LENGTH) { const prefix = parcel.id.substring(0, CADASTRAL_PREFIX_LENGTH); if (!groups[prefix]) groups[prefix] = []; groups[prefix].push(parcel); } });

        const blocks: GroupedParcelBlock[] = [];
        for (const prefix in groups) {
            const group = groups[prefix];
            if (group.length >= MIN_PARCELS_FOR_GROUPING) {
                const parcelFeatures = group.map(p => parcelToGeoJSONFeature(p.coordinates)).filter(Boolean) as Feature<GeoJsonPolygon>[]; // Filtrăm null-urile
                if (parcelFeatures.length < MIN_PARCELS_FOR_GROUPING) continue;

                try {
                    let unionedGeometry: GeoJsonPolygon | GeoJsonMultiPolygon | null = null;
                    if (parcelFeatures.length === 1) { // Deși MIN_PARCELS_FOR_GROUPING e >= 2, pentru siguranță
                        unionedGeometry = parcelFeatures[0].geometry;
                    } else if (parcelFeatures.length > 1) {
                        // Unim iterativ
                        let currentUnion: Feature<GeoJsonPolygon | GeoJsonMultiPolygon> | null = parcelFeatures[0];
                        for (let i = 1; i < parcelFeatures.length; i++) {
                            if (currentUnion && parcelFeatures[i]) { // Verificăm dacă sunt valide
                                // @ts-ignore: turfUnion poate avea probleme de tip cu Feature<Polygon> vs Geometry
                                currentUnion = turfUnion(currentUnion, parcelFeatures[i]);
                            }
                        }
                        unionedGeometry = currentUnion ? currentUnion.geometry : null;
                    }

                    if (unionedGeometry) {
                        // Creăm un Feature din geometria unită pentru centroid și bbox
                        const unionFeature = { type: "Feature", geometry: unionedGeometry, properties: {} } as Feature<GeoJsonPolygon | GeoJsonMultiPolygon>;

                        const centroidFeature = turfCentroid(unionFeature); // turfCentroid așteaptă un Feature
                        const centroidCoords = centroidFeature.geometry.coordinates as [number, number]; // [lng, lat]
                        const turfBbox = turfBbox(unionFeature); // turfBbox așteaptă un Feature
                        const leafletBounds = L.latLngBounds([[turfBbox[1], turfBbox[0]], [turfBbox[3], turfBbox[2]]]);

                        blocks.push({
                            id: prefix, geometry: unionFeature,
                            center: [centroidCoords[1], centroidCoords[0]], // Convert [lng,lat] to [lat,lng]
                            count: group.length, parcelsInGroup: group, bounds: leafletBounds
                        });
                    }
                } catch (e) { console.error(`Error creating union for group ${prefix}:`, e, parcelFeatures); }
            }
        }
        return blocks;
    }, [parcels, currentMapZoom]);

    const parcelsToRenderIndividually = useMemo(() => { /* ... (la fel) ... */ if (currentMapZoom < GROUPING_ZOOM_LEVEL) return parcels; const groupedParcelIds = new Set(groupedParcelBlocks.flatMap(block => block.parcelsInGroup.map(p => p.id))); return parcels.filter(p => !groupedParcelIds.has(p.id)); }, [parcels, groupedParcelBlocks, currentMapZoom]);
    const mapKey = useMemo(() => { /* ... (la fel) ... */ let keyParts = [internalCenter.join(','), internalZoom]; if (mapBounds && mapBounds.isValid()) { keyParts.push(mapBounds.toBBoxString()); } return keyParts.join('-'); }, [internalCenter, internalZoom, mapBounds]);

    if (typeof window === 'undefined') { return <div className={cn("bg-muted rounded-md flex items-center justify-center h-full", className)}>Se încarcă harta...</div>; }

    return (
        <MapContainer key={mapKey} center={internalCenter} zoom={internalZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true} ref={setMapInstance} className={cn("rounded-md", className)} preferCanvas={true}>
            <TileLayer attribution='' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' pane="overlayPane" />
            <ChangeView center={internalCenter} zoom={internalZoom} bounds={mapBounds} />
            <MapEvents onZoomChange={setCurrentMapZoom} />

            {parcelsToRenderIndividually.map((parcel) => {
                if (!parcel.coordinates || !Array.isArray(parcel.coordinates) || parcel.coordinates.length < 3) return null;
                const positions = parcel.coordinates.filter(c => Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number').map(c => [c[1], c[0]] as LatLngTuple);
                if (positions.length < 3) return null;
                const style = getParcelStyle(parcel);
                const owner = parcel.ownerId ? farmers.find(f => f.id === parcel.ownerId) : null;
                const cultivator = parcel.cultivatorId ? farmers.find(f => f.id === parcel.cultivatorId) : null;
                return (
                    <LeafletPolygon
                        key={`${parcel.id}-individual-${parcel.village}`}
                        positions={positions}
                        pathOptions={style}
                        eventHandlers={{
                            click: (e) => { // Leaflet click event
                                handleParcelClickInternal(parcel, e.latlng);
                            },
                        }}
                    >
                        <LeafletTooltip sticky> <strong>Parcela:</strong> {parcel.id} ({parcel.area.toFixed(2)} ha)<br /><strong>Sat:</strong> {parcel.village}<br />{owner && <><strong>Proprietar/Arendator:</strong> {owner.name}<br /></>}{cultivator && <><strong>Cultivator:</strong> {cultivator.name}<br /></>}{!owner && !cultivator && <span className="text-xs text-muted-foreground">Neatribuită</span>}</LeafletTooltip>
                    </LeafletPolygon>
                );
            })}

            {currentMapZoom >= GROUPING_ZOOM_LEVEL && groupedParcelBlocks.map(block => {
                const divIconInstance = L.divIcon({ className: 'parcel-group-label', html: `<div style="font-size: 10px; font-weight: bold; color: white; background: rgba(0,0,0,0.6); padding: 1px 3px; border-radius: 2px; white-space: nowrap;">${block.id}...(${block.count})</div>`, iconSize: [0, 0], iconAnchor: [0, 0] });
                return (
                    <React.Fragment key={block.id + '-group'}>
                        <GeoJSON
                            // @ts-ignore: Tipul 'data' din react-leaflet se așteaptă la GeoJsonObject,
                            // block.geometry este Feature<Polygon | MultiPolygon> care ar trebui să fie compatibil.
                            data={block.geometry}
                            style={() => GROUPED_BLOCK_STYLE}
                            eventHandlers={{
                                click: (e: L.LeafletMouseEvent) => { // Specificăm tipul evenimentului Leaflet
                                    if (localMapRef.current) localMapRef.current.flyToBounds(block.bounds, { padding: [20, 20] });
                                    // Pentru grup, trimitem ID-ul grupului (prefix) și detaliile grupului
                                    if (onParcelClick) onParcelClick(block.id, true, block);
                                    // Nu afișăm laturi pentru grupuri
                                }
                            }}
                        />
                        <Marker position={block.center} icon={divIconInstance}>
                            <LeafletTooltip>Prefix: {block.id} ({block.count} parcele). Click pentru zoom.</LeafletTooltip>
                        </Marker>
                    </React.Fragment>
                );
            })}
        </MapContainer>
    );
};