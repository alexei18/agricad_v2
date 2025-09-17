'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartHorizontal, Layers, ChevronsUpDown, MapPinned, Loader2, AlertCircle, PieChart as PieChartIcon, Users, Activity } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, PieChart } from 'recharts';
import { getParcelsByOwner, getParcelsByCultivator, getParcelsByVillages, Parcel } from '@/services/parcels';
import { getFarmersByVillages, Farmer } from '@/services/farmers';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFarmerVillageContext } from '@/components/layout/FarmerLayoutClient';
import Link from 'next/link';

const t = {
  pageTitle: "Statisticile mele agricole",
  pageDescriptionBase: "Analizați performanța și distribuția parcelelor dvs.",
  pageDescriptionForVillage: "în satul",
  pageDescriptionForAllVillages: "pentru toate satele operaționale.",
  loadingData: "Se încarcă statisticile...",
  errorTitle: "Eroare",
  noDataForContext: "Nu există date suficiente pentru a genera statistici pentru contextul selectat.",
  noOperationalVillages: "Nu aveți parcele înregistrate în niciun sat.",
  selectSingleVillageForDetailedStats: "Selectați un singur sat pentru a vizualiza statistici detaliate și comparative la nivel de sat.",
  myStatsCardTitle: "Statisticile mele",
  villageStatsCardTitle: "Statistici la nivel de sat",
  areaDistributionTitle: "Distribuția suprafețelor mele (Deținut vs. Cultivat)",
  owned: "Deținut de mine",
  cultivated: "Cultivat de mine",
  totalAreaInVillage: "Suprafață totală în sat",
  averageParcelSizeInVillage: "Mărime medie parcelă în sat",
  myAverageParcelSize: "Mărimea medie a parcelelor mele",
  parcels: "parcele",
  hectares: "ha",
  totalOwnedArea: "Suprafață totală deținută de mine",
  totalCultivatedArea: "Suprafață totală cultivată de mine",
  totalOwnedParcels: "Total parcele deținute de mine",
  totalCultivatedParcels: "Total parcele cultivate de mine",
  parcelsSuffix: "parcele",
  farmerDistributionInVillageTitle: "Distribuția suprafeței totale între agricultorii din sat",
  topFarmersByAreaTitle: "Top 5 agricultori din sat (după suprafața totală deținută)",
  unassignedParcelsInVillage: "Parcele neatribuite (fără Proprietar/Arendator) în sat",
};

interface ChartDataEntry { name: string; value: number; fill?: string; }
interface FarmerStatEntry { name: string; 'Suprafața ta': number; 'Media pe agricultor în sat': number; }
interface TopFarmerEntry { name: string; area: number; fill: string; }

type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; village?: string };

const CHART_COLORS_MULTI = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AA00FF', '#FF00AA', '#00AAFF', '#FFAA00'];

const renderCustomizedLabel = ({ percent }: any) => {
  return `${(percent * 100).toFixed(0)}%`;
};

export default function FarmerStatsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { selectedVillageFarm, operationalVillages, isFarmContextLoading } = useFarmerVillageContext();

  const [myOwnedParcels, setMyOwnedParcels] = useState<Parcel[]>([]);
  const [myCultivatedParcels, setMyCultivatedParcels] = useState<Parcel[]>([]);
  const [allParcelsInSelectedContext, setAllParcelsInSelectedContext] = useState<Parcel[]>([]);
  const [allFarmersInSelectedContext, setAllFarmersInSelectedContext] = useState<Omit<Farmer, 'password'>[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoVillagesMessage, setShowNoVillagesMessage] = useState(false);

  const typedUser = session?.user as SessionUser | undefined;

  const fetchDataForFarmerStats = useCallback(async () => {
    if (isFarmContextLoading || sessionStatus !== 'authenticated' || !typedUser?.id) {
      if (!isFarmContextLoading && sessionStatus !== 'loading') setLoading(false);
      return;
    }
    if (!isFarmContextLoading && operationalVillages.length === 0) {
      setShowNoVillagesMessage(true);
      setMyOwnedParcels([]); setMyCultivatedParcels([]); setAllParcelsInSelectedContext([]); setAllFarmersInSelectedContext([]);
      setLoading(false); return;
    }
    setShowNoVillagesMessage(false); setLoading(true); setError(null);

    const villagesForCurrentContext = selectedVillageFarm ? [selectedVillageFarm] : operationalVillages;

    try {
      const [owned, cultivated, contextParcels, contextFarmers] = await Promise.all([
        getParcelsByOwner(typedUser.id),
        getParcelsByCultivator(typedUser.id),
        getParcelsByVillages(villagesForCurrentContext),
        getFarmersByVillages(villagesForCurrentContext)
      ]);

      let filteredOwned = owned;
      let filteredCultivated = cultivated;

      if (selectedVillageFarm) {
        filteredOwned = owned.filter(p => p.village === selectedVillageFarm);
        filteredCultivated = cultivated.filter(p => p.village === selectedVillageFarm);
      }

      setMyOwnedParcels(filteredOwned);
      setMyCultivatedParcels(filteredCultivated);
      setAllParcelsInSelectedContext(contextParcels);
      setAllFarmersInSelectedContext(contextFarmers);

    } catch (err) {
      console.error("Error fetching data for farmer stats:", err);
      setError(err instanceof Error ? err.message : "A apărut o eroare la încărcarea statisticilor.");
      setMyOwnedParcels([]); setMyCultivatedParcels([]); setAllParcelsInSelectedContext([]); setAllFarmersInSelectedContext([]);
    } finally { setLoading(false); }
  }, [sessionStatus, typedUser?.id, selectedVillageFarm, operationalVillages, isFarmContextLoading]);

  useEffect(() => { fetchDataForFarmerStats(); }, [fetchDataForFarmerStats]);

  const pageDescription = useMemo(() => { if (isFarmContextLoading && sessionStatus === 'authenticated') return `${t.pageDescriptionBase}...`; if (showNoVillagesMessage) return t.noOperationalVillages; return selectedVillageFarm ? `${t.pageDescriptionBase} ${t.pageDescriptionForVillage} ${selectedVillageFarm}.` : `${t.pageDescriptionBase} ${t.pageDescriptionForAllVillages}`; }, [selectedVillageFarm, showNoVillagesMessage, isFarmContextLoading, sessionStatus]);
  const contextDescriptionForTitles = useMemo(() => { if (isFarmContextLoading && sessionStatus === 'authenticated') return "..."; if (showNoVillagesMessage) return t.noOperationalVillages; return selectedVillageFarm ? `în satul ${selectedVillageFarm}` : `în toate satele operaționale`; }, [selectedVillageFarm, showNoVillagesMessage, isFarmContextLoading, sessionStatus]);
  const myTotalOwnedArea = useMemo(() => myOwnedParcels.reduce((sum, p) => sum + p.area, 0), [myOwnedParcels]);
  const myTotalCultivatedArea = useMemo(() => myCultivatedParcels.reduce((sum, p) => sum + p.area, 0), [myCultivatedParcels]);
  const myNumberOfOwnedParcels = myOwnedParcels.length;
  const myNumberOfCultivatedParcels = myCultivatedParcels.length;

  const myTotalUniqueArea = useMemo(() => {
    const uniqueParcels = new Map();
    [...myOwnedParcels, ...myCultivatedParcels].forEach(p => {
      if (!uniqueParcels.has(p.id)) {
        uniqueParcels.set(p.id, p);
      }
    });
    return Array.from(uniqueParcels.values()).reduce((sum, p) => sum + p.area, 0);
  }, [myOwnedParcels, myCultivatedParcels]);

  const myAverageParcelSize = useMemo(() => {
    const allMyParcelsCount = new Set([...myOwnedParcels.map(p => p.id), ...myCultivatedParcels.map(p => p.id)]).size;
    return allMyParcelsCount > 0 ? myTotalUniqueArea / allMyParcelsCount : 0;
  }, [myOwnedParcels, myCultivatedParcels, myTotalUniqueArea]);

  const contextTotalArea = useMemo(() => allParcelsInSelectedContext.reduce((sum, p) => sum + p.area, 0), [allParcelsInSelectedContext]);
  const contextNumberOfParcels = allParcelsInSelectedContext.length;
  const contextAverageParcelSize = useMemo(() => contextNumberOfParcels > 0 ? contextTotalArea / contextNumberOfParcels : 0, [contextTotalArea, contextNumberOfParcels]);
  const contextNumberOfFarmers = allFarmersInSelectedContext.length;
  const contextAverageAreaPerFarmer = useMemo(() => contextNumberOfFarmers > 0 ? contextTotalArea / contextNumberOfFarmers : 0, [contextTotalArea, contextNumberOfFarmers]);
  const contextUnassignedParcels = useMemo(() => allParcelsInSelectedContext.filter(p => !p.ownerId).length, [allParcelsInSelectedContext]);
  const areaDistributionChartData: ChartDataEntry[] = useMemo(() => { if (myTotalOwnedArea === 0 && myTotalCultivatedArea === 0) return []; return [{ name: t.owned, value: parseFloat(myTotalOwnedArea.toFixed(2)) }, { name: t.cultivated, value: parseFloat(myTotalCultivatedArea.toFixed(2)) },]; }, [myTotalOwnedArea, myTotalCultivatedArea]);

  const farmerAreaComparisonData: FarmerStatEntry[] = useMemo(() => {
    if (!typedUser?.id || contextNumberOfFarmers === 0) return [];
    return [
      { name: "Suprafață totală gestionată", "Suprafața ta": parseFloat(myTotalUniqueArea.toFixed(2)), "Media pe agricultor în sat": parseFloat(contextAverageAreaPerFarmer.toFixed(2)) },
      { name: "Mărime medie parcelă", "Suprafața ta": parseFloat(myAverageParcelSize.toFixed(2)), "Media pe agricultor în sat": parseFloat(contextAverageParcelSize.toFixed(2)) }
    ];
  }, [typedUser, myTotalUniqueArea, contextAverageAreaPerFarmer, myAverageParcelSize, contextAverageParcelSize, contextNumberOfFarmers]);

  const farmerDistributionInVillageData: ChartDataEntry[] = useMemo(() => {
    if (!selectedVillageFarm || allFarmersInSelectedContext.length === 0 || allParcelsInSelectedContext.length === 0) return [];
    const farmerAreas: { [farmerId: string]: number } = {};
    allParcelsInSelectedContext.forEach(parcel => {
      if (parcel.ownerId) {
        farmerAreas[parcel.ownerId] = (farmerAreas[parcel.ownerId] || 0) + parcel.area;
      }
    });
    return Object.entries(farmerAreas)
      .map(([farmerId, area]) => ({
        name: allFarmersInSelectedContext.find(f => f.id === farmerId)?.name || `ID Necunoscut`,
        value: parseFloat(area.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [allParcelsInSelectedContext, allFarmersInSelectedContext, selectedVillageFarm]);

  const topFarmersData: TopFarmerEntry[] = useMemo(() => {
    if (!selectedVillageFarm || allFarmersInSelectedContext.length === 0 || allParcelsInSelectedContext.length === 0) return [];
    const farmerAreas: { [farmerId: string]: { name: string, area: number } } = {};
    allParcelsInSelectedContext.forEach(parcel => {
      if (parcel.ownerId) {
        const farmer = allFarmersInSelectedContext.find(f => f.id === parcel.ownerId);
        if (farmer) {
          if (!farmerAreas[farmer.id]) farmerAreas[farmer.id] = { name: farmer.name, area: 0 };
          farmerAreas[farmer.id].area += parcel.area;
        }
      }
    });
    return Object.values(farmerAreas)
      .sort((a, b) => b.area - a.area)
      .slice(0, 5)
      .map((f, index) => ({ ...f, area: parseFloat(f.area.toFixed(2)), fill: CHART_COLORS_MULTI[index % CHART_COLORS_MULTI.length] }));
  }, [allParcelsInSelectedContext, allFarmersInSelectedContext, selectedVillageFarm]);


  if (sessionStatus === 'loading' || loading || isFarmContextLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.errorTitle}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (showNoVillagesMessage) {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Informație</AlertTitle>
          <AlertDescription>{t.noOperationalVillages}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const noDataForFarmerInCurrentContext = myNumberOfOwnedParcels === 0 && myNumberOfCultivatedParcels === 0;

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChartHorizontal className="h-5 w-5" /> {t.pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
      </Card>

      {!selectedVillageFarm && operationalVillages.length > 1 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Vizualizare Agregată</AlertTitle>
          <AlertDescription> {t.selectSingleVillageForDetailedStats} Statisticile personale sunt agregate pentru toate satele dvs. </AlertDescription>
        </Alert>
      )}
      {selectedVillageFarm && allParcelsInSelectedContext.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Date insuficiente pentru sat</AlertTitle>
          <AlertDescription>Nu există date despre parcele în satul {selectedVillageFarm} pentru a genera statistici comparative. </AlertDescription>
        </Alert>
      )}

      {noDataForFarmerInCurrentContext && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Date personale insuficiente</AlertTitle>
          <AlertDescription>{t.noDataForContext}</AlertDescription>
        </Alert>
      )}

      {!noDataForFarmerInCurrentContext && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.myStatsCardTitle} ({contextDescriptionForTitles})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">{t.totalOwnedArea}</h3><p className="text-2xl font-bold">{myTotalOwnedArea.toFixed(2)} {t.hectares}</p></div>
            <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">{t.totalCultivatedArea}</h3><p className="text-2xl font-bold">{myTotalCultivatedArea.toFixed(2)} {t.hectares}</p></div>
            <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">{t.totalOwnedParcels}</h3><p className="text-2xl font-bold">{myNumberOfOwnedParcels} <span className="text-sm font-normal">{t.parcelsSuffix}</span></p></div>
            <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">{t.totalCultivatedParcels}</h3><p className="text-2xl font-bold">{myNumberOfCultivatedParcels} <span className="text-sm font-normal">{t.parcelsSuffix}</span></p></div>
          </CardContent>
        </Card>
      )}

      {!noDataForFarmerInCurrentContext && areaDistributionChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.areaDistributionTitle}</CardTitle>
            <CardDescription>Suprafețele dvs. {contextDescriptionForTitles}.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} ha`} />
                  <Pie
                    data={areaDistributionChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={true}
                    label={renderCustomizedLabel}
                  >
                    {areaDistributionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS_MULTI[index % CHART_COLORS_MULTI.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {selectedVillageFarm && allParcelsInSelectedContext.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.villageStatsCardTitle} ({selectedVillageFarm})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">{t.totalAreaInVillage}</h3><p className="text-2xl font-bold">{contextTotalArea.toFixed(2)} {t.hectares}</p></div>
              <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">Total parcele în sat</h3><p className="text-2xl font-bold">{contextNumberOfParcels} <span className="text-sm font-normal">{t.parcelsSuffix}</span></p></div>
              <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">Agricultori activi în sat</h3><p className="text-2xl font-bold">{contextNumberOfFarmers} <span className="text-sm font-normal"></span></p></div>
              <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">{t.averageParcelSizeInVillage}</h3><p className="text-2xl font-bold">{contextAverageParcelSize.toFixed(2)} {t.hectares}</p></div>
              <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">Suprafață medie/agricultor</h3><p className="text-2xl font-bold">{contextAverageAreaPerFarmer.toFixed(2)} {t.hectares}</p></div>
              <div className="p-4 border rounded-lg"><h3 className="text-sm font-medium text-muted-foreground">{t.unassignedParcelsInVillage}</h3><p className="text-2xl font-bold">{contextUnassignedParcels} <span className="text-sm font-normal">{t.parcelsSuffix}</span></p></div>
            </div>

            {farmerAreaComparisonData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comparație Suprafețe Gestionate</CardTitle>
                  <CardDescription>Suprafața dvs. totală gestionată și mărimea medie a parcelelor dvs. comparativ cu media din satul {selectedVillageFarm}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={farmerAreaComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis unit=" ha" />
                        <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} ha`} />
                        <Legend />
                        <Bar dataKey="Suprafața ta" fill="hsl(var(--chart-1))" radius={4} />
                        <Bar dataKey="Media pe agricultor în sat" fill="hsl(var(--chart-2))" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {farmerDistributionInVillageData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.farmerDistributionInVillageTitle}</CardTitle>
                  <CardDescription>Cum este distribuită suprafața totală deținută între agricultorii din satul {selectedVillageFarm}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip formatter={(value: number, name: string) => [`${value.toFixed(2)} ha`, name]} />
                        <Pie
                          data={farmerDistributionInVillageData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={false}
                        >
                          {farmerDistributionInVillageData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS_MULTI[index % CHART_COLORS_MULTI.length]} />
                          ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {topFarmersData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.topFarmersByAreaTitle}</CardTitle>
                  <CardDescription>Proprietari cu cea mai mare suprafață totală deținută în satul {selectedVillageFarm}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={topFarmersData} margin={{ left: 20, right: 30, top: 5, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" unit=" ha" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} interval={0} />
                        <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} ha`} />
                        <Bar dataKey="area" name="Suprafață deținută" radius={4}>
                          {topFarmersData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}