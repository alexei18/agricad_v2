// src/components/layout/FarmerLayoutClient.tsx
'use client';

import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Home, Layers, Map, BarChartHorizontal, Settings, Info, LogOut, Loader2, AlertCircle, Tractor, Package, ChevronDown, Download } from 'lucide-react';
import {
    SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
    SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, usePathname } from 'next/navigation';
import { getParcelsByOwner, getParcelsByCultivator, Parcel } from '@/services/parcels'; // Pentru a determina satele

// Tip pentru user-ul din sesiune
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; village?: string }; // village este satul principal

interface FarmerVillageContextType {
    selectedVillageFarm: string | null; // null pentru "Toate Satele"
    setSelectedVillageFarmContext: (village: string | null) => void;
    operationalVillages: string[]; // Satele în care fermierul are parcele
    isFarmContextLoading: boolean;
}
const FarmerVillageContext = createContext<FarmerVillageContextType | undefined>(undefined);

export const useFarmerVillageContext = () => {
    const context = useContext(FarmerVillageContext);
    if (!context) {
        throw new Error("useFarmerVillageContext must be used within a FarmerLayoutClient");
    }
    return context;
};

const t = {
    sidebarTitle: "AgriCad Fermier",
    operationalVillagesLabel: "Sate operaționale",
    allMyVillages: "Toate satele mele",
    dashboard: "Panou principal",
    myParcelsMap: "Harta parcelelor",
    villageStats: "Statistici sat",
    dataExport: "Export date",
    myAccount: "Contul meu",
    support: "Suport",
    logout: "Deconectare",
    headerTitleTemplate: "Panou agricultor - {villageContext}",
    loadingSession: "Se încarcă sesiunea...",
    unauthorized: "Acces neautorizat.",
    defaultVillageName: "Nespecificat",
    selectVillagePlaceholder: "Selectați un sat...",
    loadingVillages: "Se încarcă satele..."
};

export function FarmerLayoutClient({ children }: { children: React.ReactNode }) {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    // const searchParams = useSearchParams(); // temporarily disabled for build

    const [selectedVillageFarmContext, setSelectedVillageFarmContext] = useState<string | null>(undefined as any);
    const [operationalVillages, setOperationalVillages] = useState<string[]>([]);
    const [headerTitle, setHeaderTitle] = useState(t.headerTitleTemplate.replace('{villageContext}', t.loadingVillages));
    const [isFarmContextLoading, setIsFarmContextLoading] = useState(true);
    const typedUser = session?.user as SessionUser | undefined;

    useEffect(() => {
        const fetchFarmerOperationalVillages = async () => {
            if (sessionStatus === 'authenticated' && typedUser?.id) {
                setIsFarmContextLoading(true);
                try {
                    const [ownedParcels, cultivatedParcels] = await Promise.all([
                        getParcelsByOwner(typedUser.id),
                        getParcelsByCultivator(typedUser.id)
                    ]);
                    const allUserParcels = [...ownedParcels, ...cultivatedParcels];
                    const uniqueVillages = Array.from(new Set(allUserParcels.map(p => p.village))).sort();
                    setOperationalVillages(uniqueVillages);

                    // const queryParamVillage = searchParams.get('village_farm_context'); // temporarily disabled
                    const queryParamVillage = null;
                    if (queryParamVillage) {
                        if (queryParamVillage === 'ALL_VILLAGES_FARM') {
                            setSelectedVillageFarmContext(null);
                        } else if (uniqueVillages.includes(queryParamVillage)) {
                            setSelectedVillageFarmContext(queryParamVillage);
                        } else {
                            setSelectedVillageFarmContext(null); // Default la "Toate satele"
                        }
                    } else {
                        setSelectedVillageFarmContext(null); // Default la "Toate satele"
                    }

                } catch (error) {
                    console.error("Eroare la preluarea satelor operaționale ale fermierului:", error);
                    setOperationalVillages([]); // Setează la gol în caz de eroare
                    setSelectedVillageFarmContext(null);
                } finally {
                    setIsFarmContextLoading(false);
                }
            } else if (sessionStatus !== 'loading') {
                setIsFarmContextLoading(false);
            }
        };
        fetchFarmerOperationalVillages();
    }, [sessionStatus, typedUser?.id]); // removed searchParams dependency

    useEffect(() => {
        if (isFarmContextLoading) return;

        let titleVillagePart = t.loadingVillages;
        if (operationalVillages.length === 0 && sessionStatus === 'authenticated' && !isFarmContextLoading) {
            titleVillagePart = "Nicio parcelă înregistrată";
        } else if (selectedVillageFarmContext === null) {
            titleVillagePart = t.allMyVillages;
        } else if (selectedVillageFarmContext) {
            titleVillagePart = selectedVillageFarmContext;
        } else if (operationalVillages.length > 0) {
            titleVillagePart = t.allMyVillages;
        }

        setHeaderTitle(t.headerTitleTemplate.replace('{villageContext}', titleVillagePart));

        // const currentParams = new URLSearchParams(Array.from(searchParams.entries())); // temporarily disabled
        const currentParams = new URLSearchParams();
        const newVillageQueryValue = selectedVillageFarmContext === null ? 'ALL_VILLAGES_FARM' : selectedVillageFarmContext;

        if (newVillageQueryValue !== undefined && currentParams.get('village_farm_context') !== newVillageQueryValue) {
            if (newVillageQueryValue) {
                currentParams.set('village_farm_context', newVillageQueryValue);
            } else {
                currentParams.set('village_farm_context', 'ALL_VILLAGES_FARM');
            }

            const newSearch = currentParams.toString();
            // Previne actualizarea URL dacă nu există schimbări reale sau e prima randare
            // temporarily disabled: if (newSearch !== searchParams.toString() && ...)
            if (pathname.startsWith("/farmer/dashboard") || pathname.startsWith("/farmer/map") || pathname.startsWith("/farmer/stats") || pathname.startsWith("/farmer/export")) {
                router.replace(`${pathname}?${newSearch}`, { scroll: false });
            }
        }
    }, [selectedVillageFarmContext, operationalVillages, isFarmContextLoading, sessionStatus, router, pathname]); // removed searchParams


    const handleSetSelectedVillageFarmContext = (village: string | null) => {
        setSelectedVillageFarmContext(village);
    };

    const contextValue = useMemo(() => ({
        selectedVillageFarm: selectedVillageFarmContext,
        setSelectedVillageFarmContext: handleSetSelectedVillageFarmContext,
        operationalVillages: operationalVillages,
        isFarmContextLoading: isFarmContextLoading,
    }), [selectedVillageFarmContext, operationalVillages, isFarmContextLoading]);

    if (sessionStatus === 'loading') {
        return (<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">{t.loadingSession}</span></div>);
    }
    if (sessionStatus === 'unauthenticated') {
        return (<div className="flex h-screen items-center justify-center"><Alert variant="destructive" className="w-auto"><AlertCircle className="h-4 w-4" /> <AlertTitle>Eroare</AlertTitle><AlertDescription>{t.unauthorized} <Link href="/" className="font-bold underline">Autentificare</Link></AlertDescription></Alert></div>);
    }

    const displayVillageInSidebar = operationalVillages.length === 1 ? operationalVillages[0] : operationalVillages.length > 1 ? `${operationalVillages.length} sate` : (sessionStatus === 'authenticated' && !isFarmContextLoading ? "Nicio parcelă" : t.loadingVillages);

    return (
        <FarmerVillageContext.Provider value={contextValue}>
            <SidebarProvider>
                <Sidebar>
                    <SidebarHeader>
                        <div className="flex flex-col items-start gap-2 p-2">
                            <div className="flex items-center gap-2"><Layers className="w-6 h-6 text-primary" /><span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">{t.sidebarTitle}</span></div>
                            <Badge variant="secondary" className="ml-1 group-data-[collapsible=icon]:hidden" title={operationalVillages.join(', ')}>{t.operationalVillagesLabel}: {displayVillageInSidebar}</Badge>
                            <Badge variant="outline" className="hidden group-data-[collapsible=icon]:inline-flex" title={operationalVillages.join(', ')}><Map className="h-3 w-3" /></Badge>
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarMenu>
                            <SidebarMenuItem><Link href="/farmer/dashboard" className="w-full"><SidebarMenuButton tooltip={t.dashboard} isActive={pathname === '/farmer/dashboard'}><Home /><span>{t.dashboard}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/farmer/map" className="w-full"><SidebarMenuButton tooltip={t.myParcelsMap} isActive={pathname.startsWith('/farmer/map')}><Map /><span>{t.myParcelsMap}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/farmer/stats" className="w-full"><SidebarMenuButton tooltip={t.villageStats} isActive={pathname.startsWith('/farmer/stats')}><BarChartHorizontal /><span>{t.villageStats}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/farmer/export" className="w-full"><SidebarMenuButton tooltip={t.dataExport} isActive={pathname.startsWith('/farmer/export')}><Download /><span>{t.dataExport}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/farmer/account" className="w-full"><SidebarMenuButton tooltip={t.myAccount} isActive={pathname.startsWith('/farmer/account')}><Settings /><span>{t.myAccount}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/farmer/support" className="w-full"><SidebarMenuButton tooltip={t.support} isActive={pathname.startsWith('/farmer/support')}><Info /><span>{t.support}</span></SidebarMenuButton></Link></SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter><SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={() => signOut({ callbackUrl: '/' })} className="w-full"><LogOut /><span>{t.logout}</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
                </Sidebar>
                <SidebarInset>
                    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 gap-4">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="text-lg sm:text-xl font-semibold text-foreground">{headerTitle}</h1>
                        </div>
                        {!isFarmContextLoading && operationalVillages.length > 0 && (
                            operationalVillages.length === 1 ? (
                                <Badge variant="outline">{operationalVillages[0]}</Badge>
                            ) : (
                                <Select
                                    value={selectedVillageFarmContext === null ? 'ALL_VILLAGES_FARM' : selectedVillageFarmContext || ''}
                                    onValueChange={(value) => { handleSetSelectedVillageFarmContext(value === 'ALL_VILLAGES_FARM' ? null : value); }}
                                >
                                    <SelectTrigger className="w-auto min-w-[180px] max-w-xs">
                                        <SelectValue placeholder={t.selectVillagePlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL_VILLAGES_FARM">{t.allMyVillages} ({operationalVillages.length})</SelectItem>
                                        {operationalVillages.map(village => (<SelectItem key={village} value={village}>{village}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            )
                        )}
                        {isFarmContextLoading && sessionStatus === 'authenticated' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    </header>
                    {!isFarmContextLoading ? children : <div className="p-6"><Skeleton className="h-screen w-full" /></div>}
                </SidebarInset>
            </SidebarProvider>
        </FarmerVillageContext.Provider>
    );
}