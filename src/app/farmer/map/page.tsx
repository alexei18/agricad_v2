// src/app/farmer/map/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParcelMap } from '@/components/maps/parcel-map';
import { getParcelsByOwner, getParcelsByCultivator, getParcelsByVillages, Parcel } from '@/services/parcels';
import { Farmer, getFarmerById, getFarmersByVillages } from '@/services/farmers';
import { Loader2, MapPinned, AlertCircle, Map as MapIcon, Eye, Users } from 'lucide-react'; // Adăugat Eye, Users
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFarmerVillageContext } from '@/components/layout/FarmerLayoutClient';
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch"; // Import Switch
import { Label } from "@/components/ui/label";   // Import Label

const t = {
    pageTitle: "Harta parcelelor",
    pageDescriptionBase: "Vizualizați locația geografică a parcelelor",
    pageDescriptionForVillage: "din satul",
    pageDescriptionForAllVillages: "din toate satele operaționale.",
    loadingMap: "Se încarcă harta și datele parcelelor...",
    errorTitle: "Eroare",
    noParcelsToDisplayFarmer: "Nu aveți parcele înregistrate în contextul selectat.",
    noParcelsToDisplayVillage: "Nu există parcele înregistrate în acest sat/context.",
    noOperationalVillages: "Nu aveți parcele înregistrate în niciun sat.",
    ownedParcelsLegend: "Parcele Deținute de dvs.",
    cultivatedParcelsLegend: "Parcele Cultivate de dvs.",
    ownedAndCultivatedLegend: "Deținute & Cultivate de dvs.",
    otherParcelsLegend: "Alte parcele din sat",
    mapInfo: "Interacționați cu harta pentru a explora parcelele.",
    mapViewToggleLabel: "Mod vizualizare:",
    myParcelsView: "Doar parcelele mele",
    allParcelsInVillageView: "Toate parcelele din sat",
};

type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; village?: string };
type MapViewMode = 'myParcels' | 'allParcelsInContext';

export default function FarmerMapPage() {
    const { data: session, status: sessionStatus } = useSession();
    const { selectedVillageFarm, operationalVillages, isFarmContextLoading } = useFarmerVillageContext();

    const [mapViewMode, setMapViewMode] = useState<MapViewMode>('myParcels'); // Implicit: doar parcelele fermierului
    const [parcelsToDisplay, setParcelsToDisplay] = useState<Parcel[]>([]);
    const [allFarmersInContext, setAllFarmersInContext] = useState<Omit<Farmer, 'password'>[]>([]); // Pentru modul 'allParcelsInContext'
    const [currentFarmerDetails, setCurrentFarmerDetails] = useState<Omit<Farmer, 'password'> | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showNoVillagesMessage, setShowNoVillagesMessage] = useState(false);

    const typedUser = session?.user as SessionUser | undefined;

    const fetchDataForMap = useCallback(async () => {
        if (isFarmContextLoading || sessionStatus !== 'authenticated' || !typedUser?.id) {
            if (!isFarmContextLoading && sessionStatus !== 'loading') setLoading(false);
            return;
        }
        if (!isFarmContextLoading && operationalVillages.length === 0) {
            setShowNoVillagesMessage(true); setParcelsToDisplay([]); setCurrentFarmerDetails(null); setAllFarmersInContext([]); setLoading(false); return;
        }
        setShowNoVillagesMessage(false); setLoading(true); setError(null);

        const villagesForContext = selectedVillageFarm ? [selectedVillageFarm] : operationalVillages;

        try {
            console.log(`[FarmerMap] Fetching data. Mode: ${mapViewMode}. Context Villages: ${villagesForContext.join(',')}`);

            // Preluăm întotdeauna detaliile fermierului curent
            const farmerDetailsData = await getFarmerById(typedUser.id);
            setCurrentFarmerDetails(farmerDetailsData);

            if (mapViewMode === 'myParcels') {
                const [ownedParcelsData, cultivatedParcelsData] = await Promise.all([
                    getParcelsByOwner(typedUser.id),
                    getParcelsByCultivator(typedUser.id)
                ]);
                const allMyParcelsMap = new Map<string, Parcel>();
                ownedParcelsData.forEach(p => allMyParcelsMap.set(p.id, p));
                cultivatedParcelsData.forEach(p => {
                    if (!allMyParcelsMap.has(p.id)) allMyParcelsMap.set(p.id, p);
                    else { const existing = allMyParcelsMap.get(p.id)!; if (!existing.cultivatorId && p.cultivatorId) existing.cultivatorId = p.cultivatorId; }
                });
                const allMyParcels = Array.from(allMyParcelsMap.values());
                setParcelsToDisplay(selectedVillageFarm ? allMyParcels.filter(p => p.village === selectedVillageFarm) : allMyParcels);
                if (farmerDetailsData) setAllFarmersInContext([farmerDetailsData]); // Doar fermierul curent pentru highlight
                else setAllFarmersInContext([]);

            } else { // mapViewMode === 'allParcelsInContext'
                if (villagesForContext.length > 0) {
                    const [allParcelsInSelectedContext, allFarmersInSelectedContext] = await Promise.all([
                        getParcelsByVillages(villagesForContext),
                        getFarmersByVillages(villagesForContext)
                    ]);
                    setParcelsToDisplay(allParcelsInSelectedContext);
                    setAllFarmersInContext(allFarmersInSelectedContext);
                } else { // Cazul puțin probabil (operationalVillages e gol, dar s-a trecut de verificarea inițială)
                    setParcelsToDisplay([]);
                    setAllFarmersInContext([]);
                }
            }
        } catch (err) {
            console.error("Error fetching data for farmer map:", err);
            setError(err instanceof Error ? err.message : "A apărut o eroare la încărcarea datelor pentru hartă.");
            setParcelsToDisplay([]); setAllFarmersInContext([]); setCurrentFarmerDetails(null);
        } finally { setLoading(false); }
    }, [sessionStatus, typedUser?.id, selectedVillageFarm, operationalVillages, isFarmContextLoading, mapViewMode]);

    useEffect(() => { fetchDataForMap(); }, [fetchDataForMap]);

    const pageDescription = useMemo(() => {
        if (isFarmContextLoading && sessionStatus === 'authenticated') return `${t.pageDescriptionBase}...`;
        if (showNoVillagesMessage) return t.noOperationalVillages;
        const base = mapViewMode === 'myParcels' ? "parcelelor dvs." : "tuturor parcelelor";
        return selectedVillageFarm
            ? `${t.pageDescriptionBase} ${base} ${t.pageDescriptionForVillage} ${selectedVillageFarm}.`
            : `${t.pageDescriptionBase} ${base} ${t.pageDescriptionForAllVillages}`;
    }, [selectedVillageFarm, showNoVillagesMessage, isFarmContextLoading, sessionStatus, mapViewMode]);

    const mapCenter = useMemo(() => {
        if (parcelsToDisplay.length > 0 && parcelsToDisplay[0].coordinates && parcelsToDisplay[0].coordinates.length > 0) {
            const firstCoordPair = parcelsToDisplay[0].coordinates[0];
            if (Array.isArray(firstCoordPair) && firstCoordPair.length === 2) {
                return [firstCoordPair[1], firstCoordPair[0]] as [number, number]; // [lat, lng]
            }
        }
        return undefined;
    }, [parcelsToDisplay]);

    if (sessionStatus === 'loading' || loading || isFarmContextLoading) { /* ... schelet ... */ return (<div className="flex-1 p-4 sm:p-6 space-y-6"><Card className="shadow-md"><CardHeader> <Skeleton className="h-6 w-1/2" /> <Skeleton className="h-4 w-3/4 mt-1" /> </CardHeader><CardContent> <Skeleton className="h-[500px] w-full" /> </CardContent></Card></div>); }
    if (error) { /* ... eroare ... */ return (<div className="flex-1 p-4 sm:p-6"> <Alert variant="destructive"> <AlertCircle className="h-4 w-4" /><AlertTitle>{t.errorTitle}</AlertTitle><AlertDescription>{error}</AlertDescription> </Alert> </div>); }
    if (showNoVillagesMessage) { /* ... mesaj ... */ return (<div className="flex-1 p-4 sm:p-6"> <Alert> <AlertCircle className="h-4 w-4" /><AlertTitle>Informație</AlertTitle><AlertDescription>{t.noOperationalVillages}</AlertDescription> </Alert> </div>); }

    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2"><MapIcon className="h-5 w-5" /> {t.pageTitle}</CardTitle>
                            <CardDescription>{pageDescription}</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                            <Switch
                                id="map-view-mode-toggle"
                                checked={mapViewMode === 'allParcelsInContext'}
                                onCheckedChange={(checked) => setMapViewMode(checked ? 'allParcelsInContext' : 'myParcels')}
                                disabled={isFarmContextLoading || (operationalVillages.length === 0 && !selectedVillageFarm)}
                            />
                            <Label htmlFor="map-view-mode-toggle" className="text-sm">
                                {mapViewMode === 'myParcels' ? t.myParcelsView : t.allParcelsInVillageView}
                            </Label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {parcelsToDisplay.length > 0 ? (
                        <>
                            <div className="mb-4 text-sm text-muted-foreground">{t.mapInfo}</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-xs">
                                {mapViewMode === 'myParcels' && currentFarmerDetails && (
                                    <>
                                        <div className="flex items-center"><div className="w-3 h-3 mr-1.5 rounded-sm" style={{ backgroundColor: currentFarmerDetails.color || '#00FF00', opacity: 0.6 }}></div>{t.ownedAndCultivatedLegend}</div>
                                        <div className="flex items-center"><div className="w-3 h-3 mr-1.5 rounded-sm" style={{ backgroundColor: currentFarmerDetails.color || '#008000', opacity: 0.4 }}></div>{t.ownedParcelsLegend}</div>
                                        <div className="flex items-center"><div className="w-3 h-3 mr-1.5 rounded-sm" style={{ backgroundColor: currentFarmerDetails.color || '#FFFF00', opacity: 0.5 }}></div>{t.cultivatedParcelsLegend}</div>
                                    </>
                                )}
                                {mapViewMode === 'allParcelsInContext' && (
                                    <div className="flex items-center"><div className="w-3 h-3 mr-1.5 rounded-sm bg-gray-400 opacity-50"></div>{t.otherParcelsLegend}</div>
                                )}
                            </div>
                            <div className="h-[65vh] min-h-[450px] w-full rounded-md border bg-muted">
                                <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                                    <ParcelMap
                                        parcels={parcelsToDisplay}
                                        farmers={mapViewMode === 'myParcels' && currentFarmerDetails ? [currentFarmerDetails] : allFarmersInContext}
                                        selectedFarmerId={typedUser?.id} // Întotdeauna evidențiază parcelele fermierului logat
                                        highlightMode="farmer"
                                        centerCoordinates={mapCenter}
                                        initialZoom={parcelsToDisplay.length > 0 ? (selectedVillageFarm ? 14 : 12) : 10}
                                    />
                                </Suspense>
                            </div>
                        </>
                    ) : (
                        <Alert>
                            <MapPinned className="h-4 w-4" />
                            <AlertTitle>Nicio parcelă</AlertTitle>
                            <AlertDescription>
                                {mapViewMode === 'myParcels' ? t.noParcelsToDisplayFarmer : t.noParcelsToDisplayVillage}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}