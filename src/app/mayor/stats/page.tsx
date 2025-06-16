'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartHorizontal, Users, MapPin, Loader2, AlertCircle, PieChart, Maximize } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getParcelsByVillages, Parcel } from '@/services/parcels';
import { getFarmersByVillages, Farmer } from '@/services/farmers';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMayorVillageContext } from '@/components/layout/MayorLayoutClient';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Obiectul cu texte traduse - am adăugat și ajustat chei pentru noul grafic
const t = {
  pageTitle: "Statistici detaliate",
  pageDescriptionBase: "Analizați datele agricole",
  pageDescriptionForVillage: "pentru satul",
  pageDescriptionForAllVillages: "pentru toate satele gestionate.",
  loadingData: "Se încarcă statisticile...",
  noDataForContext: "Nu există date suficiente pentru a genera statistici pentru contextul selectat.",
  noVillagesManagedError: "Nu gestionați niciun sat. Statisticile nu pot fi afișate.",
  errorTitle: "Eroare",
  totalParcelsChartTitle: "Total parcele",
  totalAreaChartTitle: "Suprafață totală (ha)",
  farmersTitle: "Agricultori",
  farmersDescription: "Numărul de agricultori cu activitate (parcele deținute/cultivate) în",
  parcelsByStatusTitle: "Distribuția parcelelor după statut",
  parcelsByStatusDescription: "Clasificarea parcelelor după starea de proprietate și cultivare.",
  farmersWithMostParcelsTitle: "Top 5 agricultori (după nr. parcele deținute)",
  viewDashboardLink: "Vezi panoul principal",
  viewParcelsLink: "Vezi management parcele",
  selectSingleVillageForCharts: "Selectați un singur sat pentru a vizualiza grafice detaliate.",
  // Chei noi pentru categoriile din PieChart
  rentedOut: "Arendate",
  cultivatedByOwner: "Cultivate de proprietar",
  unassigned: "Neatribuite",
};

interface ChartDataEntry {
  name: string;
  value: number;
}

interface FarmerParcelCount {
  farmerId: string;
  farmerName: string;
  parcelCount: number;
}

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function MayorStatsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { selectedVillage, managedVillages } = useMayorVillageContext();

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [farmers, setFarmers] = useState<Omit<Farmer, 'password'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoVillagesError, setShowNoVillagesError] = useState(false);

  const fetchDataForStats = useCallback(async () => {
    if (sessionStatus !== 'authenticated' || !session?.user) {
      setLoading(false); return;
    }
    if (managedVillages.length === 0) {
      setShowNoVillagesError(true); setLoading(false); return;
    }
    setShowNoVillagesError(false);

    if (!selectedVillage) {
      setParcels([]);
      setFarmers([]);
      setLoading(false);
      return;
    }

    setLoading(true); setError(null);
    const villagesToFetch = [selectedVillage];

    try {
      console.log(`[MayorStats] Fetching parcels and farmers for stats in village: ${selectedVillage}`);
      const [parcelsData, farmersData] = await Promise.all([
        getParcelsByVillages(villagesToFetch),
        getFarmersByVillages(villagesToFetch)
      ]);
      setParcels(parcelsData);
      setFarmers(farmersData);
    } catch (err) {
      console.error("Error fetching data for stats:", err);
      setError(err instanceof Error ? err.message : "A apărut o eroare la încărcarea datelor pentru statistici.");
      setParcels([]);
      setFarmers([]);
    } finally {
      setLoading(false);
    }
  }, [sessionStatus, session, selectedVillage, managedVillages]);

  useEffect(() => {
    fetchDataForStats();
  }, [fetchDataForStats]);

  const pageDescription = selectedVillage
    ? `${t.pageDescriptionBase} ${t.pageDescriptionForVillage} ${selectedVillage}.`
    : `${t.pageDescriptionBase} ${t.pageDescriptionForAllVillages}`;

  const contextQueryParam = selectedVillage ? `?village_context=${selectedVillage}` : '?village_context=ALL_VILLAGES';

  // *** LOGICĂ CORECTATĂ PENTRU PIE CHART ***
  const parcelDistributionData: ChartDataEntry[] = useMemo(() => {
    if (!selectedVillage || parcels.length === 0) return [];

    let rentedOut = 0;
    let cultivatedByOwner = 0;
    let unassigned = 0;

    parcels.forEach(p => {
      if (p.ownerId) {
        // Are proprietar. Verificăm dacă este arendată sau cultivată de proprietar.
        if (p.cultivatorId && p.cultivatorId !== p.ownerId) {
          rentedOut++;
        } else {
          cultivatedByOwner++;
        }
      } else {
        // Nu are proprietar, deci este neatribuită.
        unassigned++;
      }
    });

    const data = [];
    if (rentedOut > 0) data.push({ name: t.rentedOut, value: rentedOut });
    if (cultivatedByOwner > 0) data.push({ name: t.cultivatedByOwner, value: cultivatedByOwner });
    if (unassigned > 0) data.push({ name: t.unassigned, value: unassigned });

    return data;
  }, [parcels, selectedVillage]);


  const topFarmersByOwnedParcels: FarmerParcelCount[] = useMemo(() => {
    if (!selectedVillage || farmers.length === 0 || parcels.length === 0) return [];

    const farmerCounts: { [key: string]: number } = {};
    parcels.forEach(parcel => {
      if (parcel.ownerId) {
        farmerCounts[parcel.ownerId] = (farmerCounts[parcel.ownerId] || 0) + 1;
      }
    });

    return Object.entries(farmerCounts)
      .map(([farmerId, parcelCount]) => {
        const farmer = farmers.find(f => f.id === farmerId);
        return {
          farmerId,
          farmerName: farmer ? farmer.name : `ID: ${farmerId.substring(0, 6)}...`,
          parcelCount
        };
      })
      .sort((a, b) => b.parcelCount - a.parcelCount)
      .slice(0, 5);
  }, [parcels, farmers, selectedVillage]);

  if (sessionStatus === 'loading' || (loading && selectedVillage)) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <Card className="shadow-md">
          <CardHeader> <Skeleton className="h-6 w-1/2" /> <Skeleton className="h-4 w-3/4 mt-1" /> </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showNoVillagesError) {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <Alert variant="destructive"> <AlertCircle className="h-4 w-4" /><AlertTitle>{t.errorTitle}</AlertTitle><AlertDescription>{t.noVillagesManagedError}</AlertDescription></Alert>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <Alert variant="destructive"> <AlertCircle className="h-4 w-4" /><AlertTitle>{t.errorTitle}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      </div>
    );
  }


  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChartHorizontal className="h-5 w-5" /> {t.pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedVillage && (
            <Alert>
              <PieChart className="h-4 w-4" />
              <AlertTitle>Informații agregate</AlertTitle>
              <AlertDescription>
                {t.selectSingleVillageForCharts} Puteți vedea un rezumat general în <Link href={`/mayor/dashboard${contextQueryParam}`} className="font-medium text-primary hover:underline">{t.viewDashboardLink}</Link> sau naviga la <Link href={`/mayor/parcels${contextQueryParam}`} className="font-medium text-primary hover:underline">{t.viewParcelsLink}</Link> pentru a vizualiza datele combinate.
              </AlertDescription>
            </Alert>
          )}

          {selectedVillage && (parcels.length > 0 || farmers.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1"><MapPin className="h-4 w-4" /> {t.totalParcelsChartTitle}</CardTitle>
                  <CardDescription>Numărul total de parcele înregistrate în {selectedVillage}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-center py-10">{parcels.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1"><Maximize className="h-4 w-4" /> {t.totalAreaChartTitle}</CardTitle>
                  <CardDescription>Suprafața totală a parcelelor din {selectedVillage}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-center py-10">
                    {parcels.reduce((sum, p) => sum + p.area, 0).toFixed(2)} ha
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1"><Users className="h-4 w-4" /> {t.farmersTitle}</CardTitle>
                  <CardDescription>{t.farmersDescription} {selectedVillage}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-center py-10">{new Set(parcels.flatMap(p => [p.ownerId, p.cultivatorId]).filter(id => id !== null)).size}</div>
                </CardContent>
              </Card>

              {parcelDistributionData.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">{t.parcelsByStatusTitle}</CardTitle>
                    <CardDescription>{t.parcelsByStatusDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{}} className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          <Pie
                            data={parcelDistributionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            labelLine={false}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                              const RADIAN = Math.PI / 180;
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              return (
                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px" fontWeight="bold">
                                  {`${(percent * 100).toFixed(0)}%`}
                                </text>
                              );
                            }}
                          >
                            {parcelDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {topFarmersByOwnedParcels.length > 0 && (
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">{t.farmersWithMostParcelsTitle}</CardTitle>
                    <CardDescription>Cei mai activi proprietari de parcele în {selectedVillage}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{}} className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topFarmersByOwnedParcels} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis dataKey="farmerName" type="category" width={120} tick={{ fontSize: 10 }} interval={0} />
                          <ChartTooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={<ChartTooltipContent indicator="dot" hideLabel />}
                          />
                          <Bar dataKey="parcelCount" name="Nr. parcele" radius={4}>
                            {topFarmersByOwnedParcels.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          {selectedVillage && parcels.length === 0 && !loading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Date insuficiente</AlertTitle>
              <AlertDescription>{t.noDataForContext}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}