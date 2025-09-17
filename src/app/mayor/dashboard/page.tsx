// src/app/mayor/dashboard/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getParcelsByVillages, Parcel } from '@/services/parcels'; // MODIFICAT: Folosim getParcelsByVillages
import { getFarmersByVillages, Farmer } from '@/services/farmers'; // MODIFICAT: Folosim getFarmersByVillages
import { getMayorById, MayorWithManagedVillages } from '@/services/mayors';
import { Loader2, Users, MapPin, BarChartHorizontal, AlertCircle, Edit3, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMayorVillageContext } from '@/components/layout/MayorLayoutClient'; // Import context

interface DashboardStats {
  totalParcels: number;
  totalArea: number;
  numberOfFarmers: number;
  contextDescription: string;
}

export default function MayorDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const { selectedVillage, managedVillages } = useMayorVillageContext(); // Utilizăm contextul

  // Nu mai avem nevoie de state-ul 'mayor' și 'currentMayorVillage' aici,
  // deoarece 'managedVillages' vine din context, iar ID-ul primarului e în sesiune.

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [farmers, setFarmers] = useState<Omit<Farmer, 'password'>[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataForContext = useCallback(async () => {
    if (sessionStatus !== 'authenticated' || !session?.user || managedVillages.length === 0) {
      if (managedVillages.length === 0 && sessionStatus === 'authenticated') {
        // Primarul nu gestionează niciun sat
        setDashboardStats({
          totalParcels: 0,
          totalArea: 0,
          numberOfFarmers: 0,
          contextDescription: "Niciun sat gestionat",
        });
        setParcels([]);
        setFarmers([]);
      }
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setError(null);

    const villagesToFetch = selectedVillage ? [selectedVillage] : managedVillages;
    const contextDesc = selectedVillage ? selectedVillage : "toate satele gestionate";

    try {
      console.log(`[MayorDashboard] Fetching data for context: ${contextDesc}`);

      const [parcelsData, farmersData] = await Promise.all([
        getParcelsByVillages(villagesToFetch), // Funcție actualizată pentru array de sate
        getFarmersByVillages(villagesToFetch)  // Funcție actualizată pentru array de sate
      ]);

      setParcels(parcelsData);
      setFarmers(farmersData);

      const totalArea = parcelsData.reduce((sum, parcel) => sum + parcel.area, 0);

      // Numărul de fermieri unici din datele preluate
      const uniqueFarmerIds = new Set(farmersData.map(f => f.id));

      setDashboardStats({
        totalParcels: parcelsData.length,
        totalArea: totalArea,
        numberOfFarmers: uniqueFarmerIds.size,
        contextDescription: contextDesc,
      });

    } catch (err) {
      console.error(`Error fetching dashboard data for ${contextDesc}:`, err);
      const errorMessage = err instanceof Error ? err.message : "Nu s-au putut încărca datele pentru panoul principal.";
      setError(errorMessage);
      setDashboardStats(null);
      setParcels([]);
      setFarmers([]);
    } finally {
      setLoadingData(false);
    }
  }, [sessionStatus, session, selectedVillage, managedVillages]);

  useEffect(() => {
    fetchDataForContext();
  }, [fetchDataForContext]); // Rulează când contextul de sat se schimbă

  const renderLoadingList = (count = 5) => (
    Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex justify-between items-center p-2 animate-pulse">
        <div className="flex-1 space-y-1 pr-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-4 w-1/4" />
      </div>
    ))
  );

  const renderStatCardSkeleton = (title: string, icon: React.ElementType) => {
    const IconComponent = icon;
    return (
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <IconComponent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mt-1" />
          <Skeleton className="h-3 w-32 mt-1" />
        </CardContent>
      </Card>
    );
  };

  if (sessionStatus === 'loading') {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {renderStatCardSkeleton("Total parcele", MapPin)}
          {renderStatCardSkeleton("Suprafață totală", BarChartHorizontal)}
          {renderStatCardSkeleton("Agricultori înregistrați", Users)}
        </div>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-56 mt-1" /></CardHeader><CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64 mt-1" /></CardHeader><CardContent><ScrollArea className="h-[250px] rounded-md border"><div className="p-4 space-y-2">{renderLoadingList(5)}</div></ScrollArea></CardContent></Card>
      </div>
    );
  }

  if (error && !loadingData) { // Afișează eroarea doar dacă nu mai e loadingData
    return (
      <div className="flex-1 p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Eroare</AlertTitle>
          <AlertDescription>
            {error} Vă rugăm reîncărcați pagina sau selectați alt sat. Contactați suportul dacă problema persistă.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loadingData || !dashboardStats) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {renderStatCardSkeleton("Total parcele", MapPin)}
          {renderStatCardSkeleton("Suprafață totală", BarChartHorizontal)}
          {renderStatCardSkeleton("Agricultori înregistrați", Users)}
        </div>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-56 mt-1" /></CardHeader><CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
        <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64 mt-1" /></CardHeader><CardContent><ScrollArea className="h-[250px] rounded-md border"><div className="p-4 space-y-2">{renderLoadingList(5)}</div></ScrollArea></CardContent></Card>
      </div>
    );
  }

  const mayorDisplayName = session?.user?.name || "Primar";
  const contextDisplay = selectedVillage ? `satul ${selectedVillage}` : "satele gestionate";
  const actionLinksContextQuery = selectedVillage ? `?village_context=${selectedVillage}` : `?village_context=ALL_VILLAGES`;


  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total parcele</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalParcels}</div>
            <p className="text-xs text-muted-foreground">parcele în {contextDisplay}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suprafață totală</CardTitle>
            <BarChartHorizontal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalArea.toFixed(2)} ha</div>
            <p className="text-xs text-muted-foreground">hectare totale în {contextDisplay}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agricultori activi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.numberOfFarmers}</div>
            <p className="text-xs text-muted-foreground">agricultori cu activitate în {contextDisplay}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Acțiuni rapide</CardTitle>
          <CardDescription>Navigați la zonele cheie de management pentru {contextDisplay}.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href={`/mayor/farmers${actionLinksContextQuery}`} passHref>
            <Button variant="outline" className="w-full">
              <Users className="mr-2 h-4 w-4" /> Gestionează agricultori
            </Button>
          </Link>
          <Link href={`/mayor/parcels${actionLinksContextQuery}`} passHref>
            <Button variant="outline" className="w-full">
              <Edit3 className="mr-2 h-4 w-4" /> Gestionează parcele
            </Button>
          </Link>
          <Link href={`/mayor/stats${actionLinksContextQuery}`} passHref>
            <Button variant="outline" className="w-full">
              <BarChartHorizontal className="mr-2 h-4 w-4" /> Vezi statistici
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Activitate recentă agricultori</CardTitle>
          <CardDescription>Prezentare generală a celor mai recent actualizați agricultori din {contextDisplay}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] rounded-md border">
            {farmers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nume</TableHead>
                    <TableHead>Cod fiscal</TableHead>
                    <TableHead>Sat principal</TableHead>
                    <TableHead className="text-right">Ultima actualizare</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmers
                    .sort((a, b) => (new Date(b.updatedAt).getTime()) - (new Date(a.updatedAt).getTime()))
                    .slice(0, 10)
                    .map((farmer) => (
                      <TableRow key={farmer.id}>
                        <TableCell className="font-medium">{farmer.name}</TableCell>
                        <TableCell>{farmer.companyCode}</TableCell>
                        <TableCell>{farmer.village}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(farmer.updatedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-4 text-center text-muted-foreground">Nu s-au găsit agricultori pentru {contextDisplay}.</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}