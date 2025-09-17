// src/app/farmer/dashboard/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getParcelsByOwner, getParcelsByCultivator, Parcel } from '@/services/parcels';
// CORECȚIE IMPORT ICONIȚE: Importăm toate iconițele necesare din lucide-react
import {
  Loader2,
  MapPin, // Pentru Total Parcele Deținute
  BarChartHorizontal, // Pentru Total Parcele Cultivate și Statistici Sat
  AlertCircle,
  Download,
  Layers,         // Pentru Suprafață Deținută
  ChevronsUpDown, // Pentru Suprafață Cultivată
  Home,           // Pentru Panou Principal
  Map             // Pentru Harta Parcelelor
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFarmerVillageContext } from '@/components/layout/FarmerLayoutClient';
import { Badge } from '@/components/ui/badge';

const t = {
  pageTitle: "Panoul meu de control",
  pageDescriptionBase: "Vizualizați un rezumat al activității dvs. agricole",
  pageDescriptionForVillage: "pentru satul",
  pageDescriptionForAllVillages: "pentru toate satele operaționale.",
  loadingData: "Se încarcă datele...",
  errorTitle: "Eroare",
  noOperationalVillages: "Nu aveți parcele înregistrate în niciun sat.",
  totalOwnedArea: "Suprafață totală deținută",
  totalCultivatedArea: "Suprafață totală cultivată",
  totalOwnedParcels: "Total parcele deținute",
  totalCultivatedParcels: "Total parcele cultivate",
  ownedParcelsListTitle: "Parcelele mele deținute",
  cultivatedParcelsListTitle: "Parcelele mele cultivate",
  noOwnedParcels: "Nu dețineți nicio parcelă în contextul selectat.",
  noCultivatedParcels: "Nu cultivați nicio parcelă în contextul selectat.",
  hectares: "ha",
  parcelsSuffix: "parcele",
  quickActions: "Acțiuni rapide",
  viewMap: "Vezi harta parcelelor",
  viewStats: "Vezi statistici sat",
  exportData: "Exportă datele",
};

interface FarmerDashboardStats {
  totalOwnedArea: number;
  totalCultivatedArea: number;
  numberOfOwnedParcels: number;
  numberOfCultivatedParcels: number;
  contextDescription: string;
}

// Tip pentru user-ul din sesiune
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; village?: string };


export default function FarmerDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { selectedVillageFarm, operationalVillages, isFarmContextLoading } = useFarmerVillageContext();

  const [ownedParcels, setOwnedParcels] = useState<Parcel[]>([]);
  const [cultivatedParcels, setCultivatedParcels] = useState<Parcel[]>([]);
  const [dashboardStats, setDashboardStats] = useState<FarmerDashboardStats | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoVillagesMessage, setShowNoVillagesMessage] = useState(false);

  const typedUser = session?.user as SessionUser | undefined;

  const fetchDataForFarmerDashboard = useCallback(async () => {
    if (isFarmContextLoading || sessionStatus !== 'authenticated' || !typedUser?.id) {
      if (!isFarmContextLoading && sessionStatus !== 'loading') setLoadingData(false);
      return;
    }

    if (!isFarmContextLoading && operationalVillages.length === 0) {
      setShowNoVillagesMessage(true);
      setOwnedParcels([]); setCultivatedParcels([]);
      setDashboardStats({ totalOwnedArea: 0, totalCultivatedArea: 0, numberOfOwnedParcels: 0, numberOfCultivatedParcels: 0, contextDescription: t.noOperationalVillages });
      setLoadingData(false); return;
    }
    setShowNoVillagesMessage(false); setLoadingData(true); setError(null);

    const contextDesc = selectedVillageFarm ? selectedVillageFarm : "toate satele operaționale";

    try {
      const [allOwned, allCultivated] = await Promise.all([getParcelsByOwner(typedUser.id), getParcelsByCultivator(typedUser.id)]);
      let filteredOwned = allOwned; let filteredCultivated = allCultivated;

      if (selectedVillageFarm) {
        filteredOwned = allOwned.filter(p => p.village === selectedVillageFarm);
        filteredCultivated = allCultivated.filter(p => p.village === selectedVillageFarm);
      }

      setOwnedParcels(filteredOwned); setCultivatedParcels(filteredCultivated);
      const totalOwnedArea = filteredOwned.reduce((sum, parcel) => sum + parcel.area, 0);
      const totalCultivatedArea = filteredCultivated.reduce((sum, parcel) => sum + parcel.area, 0);
      setDashboardStats({ totalOwnedArea, totalCultivatedArea, numberOfOwnedParcels: filteredOwned.length, numberOfCultivatedParcels: filteredCultivated.length, contextDescription: contextDesc });
    } catch (err) {
      console.error(`Error fetching farmer dashboard data for ${contextDesc}:`, err);
      const errorMessage = err instanceof Error ? err.message : "Nu s-au putut încărca datele pentru panoul agricultorului.";
      setError(errorMessage); setDashboardStats(null); setOwnedParcels([]); setCultivatedParcels([]);
    } finally { setLoadingData(false); }
  }, [sessionStatus, typedUser?.id, selectedVillageFarm, operationalVillages, isFarmContextLoading]);

  useEffect(() => { fetchDataForFarmerDashboard(); }, [fetchDataForFarmerDashboard]);

  const pageDescription = useMemo(() => {
    if (isFarmContextLoading && sessionStatus === 'authenticated') return `${t.pageDescriptionBase}...`;
    if (showNoVillagesMessage) return t.noOperationalVillages;
    return selectedVillageFarm ? `${t.pageDescriptionBase} ${t.pageDescriptionForVillage} ${selectedVillageFarm}.` : `${t.pageDescriptionBase} ${t.pageDescriptionForAllVillages}`;
  }, [selectedVillageFarm, showNoVillagesMessage, isFarmContextLoading, sessionStatus]);

  // CORECȚIE: IconComponent trebuie să fie definit înainte de a fi folosit în renderStatCardSkeleton
  const renderStatCardSkeleton = (title: string, IconElement: React.ElementType) => (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {/* Folosim direct IconElement */}
        <IconElement className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent><Skeleton className="h-8 w-20 mt-1" /><Skeleton className="h-3 w-32 mt-1" /></CardContent>
    </Card>
  );
  const renderParcelListSkeleton = (count = 3) => Array.from({ length: count }).map((_, i) => <TableRow key={i}><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell><Skeleton className="h-4 w-12" /></TableCell></TableRow>);

  if (sessionStatus === 'loading' || loadingData || isFarmContextLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <Card><CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-1" /></CardHeader></Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {renderStatCardSkeleton(t.totalOwnedArea, Layers)}
          {renderStatCardSkeleton(t.totalCultivatedArea, ChevronsUpDown)}
          {renderStatCardSkeleton(t.totalOwnedParcels, MapPin)}
          {renderStatCardSkeleton(t.totalCultivatedParcels, BarChartHorizontal)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card><CardHeader><Skeleton className="h-5 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-5 w-1/3" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }
  if (error) { return (<div className="flex-1 p-4 sm:p-6"> <Alert variant="destructive"> <AlertCircle className="h-4 w-4" /><AlertTitle>{t.errorTitle}</AlertTitle><AlertDescription>{error}</AlertDescription> </Alert> </div>); }
  if (showNoVillagesMessage) { return (<div className="flex-1 p-4 sm:p-6"> <Alert> <AlertCircle className="h-4 w-4" /><AlertTitle>Informație</AlertTitle><AlertDescription>{t.noOperationalVillages}</AlertDescription> </Alert> </div>); }
  if (!dashboardStats) { return <div className="flex-1 p-4 sm:p-6"><p>{t.loadingData}</p></div>; }

  const contextQueryParam = selectedVillageFarm ? `?village_farm_context=${selectedVillageFarm}` : `?village_farm_context=ALL_VILLAGES_FARM`;

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          {/* Folosim iconița Home importată */}
          <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5" /> {t.pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t.totalOwnedArea}</CardTitle><Layers className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardStats.totalOwnedArea.toFixed(2)} {t.hectares}</div><p className="text-xs text-muted-foreground">în {dashboardStats.contextDescription}</p></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t.totalCultivatedArea}</CardTitle><ChevronsUpDown className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardStats.totalCultivatedArea.toFixed(2)} {t.hectares}</div><p className="text-xs text-muted-foreground">în {dashboardStats.contextDescription}</p></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t.totalOwnedParcels}</CardTitle><MapPin className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardStats.numberOfOwnedParcels}</div><p className="text-xs text-muted-foreground">{t.parcelsSuffix} în {dashboardStats.contextDescription}</p></CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{t.totalCultivatedParcels}</CardTitle><BarChartHorizontal className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{dashboardStats.numberOfCultivatedParcels}</div><p className="text-xs text-muted-foreground">{t.parcelsSuffix} în {dashboardStats.contextDescription}</p></CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader><CardTitle>{t.quickActions}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Folosim iconița Map importată */}
          <Button asChild variant="outline" className="w-full"><Link href={`/farmer/map${contextQueryParam}`}><Map className="mr-2 h-4 w-4" />{t.viewMap}</Link></Button>
          <Button asChild variant="outline" className="w-full"><Link href={`/farmer/stats${contextQueryParam}`}><BarChartHorizontal className="mr-2 h-4 w-4" />{t.viewStats}</Link></Button>
          <Button asChild variant="outline" className="w-full"><Link href={`/farmer/export${contextQueryParam}`}><Download className="mr-2 h-4 w-4" />{t.exportData}</Link></Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader><CardTitle>{t.ownedParcelsListTitle} ({dashboardStats.contextDescription})</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] rounded-md border">
              {ownedParcels.length > 0 ? (
                // CORECȚIE: Eliminat prop-ul `size` din Table dacă nu este un prop valid
                <Table><TableHeader><TableRow><TableHead>ID Parcelă</TableHead><TableHead>Sat</TableHead><TableHead className="text-right">Suprafață (ha)</TableHead></TableRow></TableHeader>
                  <TableBody>{ownedParcels.map(p => (<TableRow key={p.id}><TableCell className="font-mono text-xs">{p.id}</TableCell><TableCell>{p.village}</TableCell><TableCell className="text-right">{p.area.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table>
              ) : <p className="p-4 text-sm text-center text-muted-foreground">{t.noOwnedParcels}</p>}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader><CardTitle>{t.cultivatedParcelsListTitle} ({dashboardStats.contextDescription})</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] rounded-md border">
              {cultivatedParcels.length > 0 ? (
                // CORECȚIE: Eliminat prop-ul `size` din Table
                <Table><TableHeader><TableRow><TableHead>ID Parcelă</TableHead><TableHead>Sat</TableHead><TableHead className="text-right">Suprafață (ha)</TableHead></TableRow></TableHeader>
                  <TableBody>{cultivatedParcels.map(p => (<TableRow key={p.id}><TableCell className="font-mono text-xs">{p.id}</TableCell><TableCell>{p.village}</TableCell><TableCell className="text-right">{p.area.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table>
              ) : <p className="p-4 text-sm text-center text-muted-foreground">{t.noCultivatedParcels}</p>}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}