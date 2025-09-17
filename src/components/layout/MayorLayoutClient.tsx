// src/components/layout/MayorLayoutClient.tsx
'use client';

import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Home, Layers, Users, Edit3, Download, BarChartHorizontal, Settings, Info, LogOut, Loader2, AlertCircle, Landmark, Package, ChevronDown } from 'lucide-react';
import {
    SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
    SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset
} from "@/components/ui/sidebar"; // Asigură-te că e corect și ai SheetHeader/Title în sidebar.tsx pt mobil
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, usePathname } from 'next/navigation';

// Tip pentru user-ul din sesiune (ar trebui definit global în next-auth.d.ts)
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; villages?: string[] };

interface MayorVillageContextType {
    selectedVillage: string | null;
    setSelectedVillageContext: (village: string | null) => void;
    managedVillages: string[];
    isContextLoading: boolean; // Adăugat pentru a indica încărcarea contextului
}
const MayorVillageContext = createContext<MayorVillageContextType | undefined>(undefined);

export const useMayorVillageContext = () => {
    const context = useContext(MayorVillageContext);
    if (!context) {
        throw new Error("useMayorVillageContext must be used within a MayorLayoutClient");
    }
    return context;
};

const t = { /* ... (la fel ca înainte) ... */
    sidebarTitle: "AgriCad",
    villageLabel: "Sat",
    managedVillagesLabel: "Sate gestionate",
    allMyVillages: "Toate satele mele",
    dashboard: "Panou principal",
    manageFarmers: "Gestionare agricultori",
    manageParcels: "Gestionare parcele",
    villageStats: "Statistici sat",
    myAccount: "Contul meu",
    support: "Suport",
    logout: "Deconectare",
    headerTitleTemplate: "Panou primar - {villageContext}",
    loadingSession: "Se încarcă sesiunea...",
    unauthorized: "Acces neautorizat.",
    defaultVillageName: "Nespecificat",
    selectVillagePlaceholder: "Selectați un sat...",
    loadingVillages: "Se încarcă satele..."
};

export function MayorLayoutClient({ children }: { children: React.ReactNode }) {
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    // const searchParams = useSearchParams(); // Hook pentru a citi query params - temporarily disabled for build

    const [selectedVillageContext, setSelectedVillageContext] = useState<string | null>(undefined as any); // Inițial undefined pentru a distinge de null (Toate satele)
    const [managedVillages, setManagedVillages] = useState<string[]>([]);
    const [headerTitle, setHeaderTitle] = useState(t.headerTitleTemplate.replace('{villageContext}', t.loadingVillages));
    const [isContextLoading, setIsContextLoading] = useState(true);


    useEffect(() => {
        const typedUser = session?.user as SessionUser | undefined;
        if (sessionStatus === 'authenticated' && typedUser) {
            const mayorVillagesFromSession = typedUser.villages || [];
            console.log("[MayorLayoutClient] Sate primar din sesiune:", mayorVillagesFromSession);
            setManagedVillages(mayorVillagesFromSession.sort());

            // const queryParamVillage = searchParams.get('village_context'); // temporarily disabled
            const queryParamVillage = null;
            console.log("[MayorLayoutClient] Query param 'village_context':", queryParamVillage);

            if (queryParamVillage) {
                if (queryParamVillage === 'ALL_VILLAGES') {
                    setSelectedVillageContext(null);
                } else if (mayorVillagesFromSession.includes(queryParamVillage)) {
                    setSelectedVillageContext(queryParamVillage);
                } else { // Query param invalid, default
                    // Pentru primarii cu un singur sat, selectează automat acel sat
                    if (mayorVillagesFromSession.length === 1) {
                        setSelectedVillageContext(mayorVillagesFromSession[0]);
                    } else {
                        setSelectedVillageContext(null); // Default la "Toate satele" doar pentru primarii cu multiple sate
                    }
                }
            } else { // Niciun query param, default
                // Pentru primarii cu un singur sat, selectează automat acel sat
                if (mayorVillagesFromSession.length === 1) {
                    setSelectedVillageContext(mayorVillagesFromSession[0]);
                } else {
                    setSelectedVillageContext(null); // Default la "Toate satele" doar pentru primarii cu multiple sate
                }
            }
            setIsContextLoading(false);
        } else if (sessionStatus !== 'loading') {
            // Sesiune neautentificată sau fără user, sau încă în loading
            setIsContextLoading(false); // Finalizează încărcarea contextului dacă sesiunea nu e ok
        }
    }, [session, sessionStatus]); // removed searchParams dependency

    useEffect(() => {
        if (isContextLoading) return; // Nu actualiza titlul sau URL-ul dacă contextul încă se încarcă

        let titleVillagePart = t.loadingVillages; // Default
        if (managedVillages.length === 0 && sessionStatus === 'authenticated') {
            titleVillagePart = "Niciun sat gestionat";
        } else if (selectedVillageContext === null) {
            titleVillagePart = t.allMyVillages;
        } else if (selectedVillageContext) {
            titleVillagePart = selectedVillageContext;
        } else if (!isContextLoading && managedVillages.length > 0) { // A terminat încărcarea, dar selectedVillageContext e încă undefined, și sunt sate
            titleVillagePart = t.allMyVillages; // Default
        }

        setHeaderTitle(t.headerTitleTemplate.replace('{villageContext}', titleVillagePart));

        // Actualizează query parameter
        // const currentParams = new URLSearchParams(Array.from(searchParams.entries())); // temporarily disabled
        const currentParams = new URLSearchParams();
        const newVillageQueryValue = selectedVillageContext === null ? 'ALL_VILLAGES' : selectedVillageContext;

        if (newVillageQueryValue !== undefined && currentParams.get('village_context') !== newVillageQueryValue) {
            if (newVillageQueryValue) { // Doar dacă avem o valoare validă (nu undefined)
                currentParams.set('village_context', newVillageQueryValue);
            } else { // Dacă newVillageQueryValue e null (ALL_VILLAGES) și nu era deja, sau e undefined și vrem să-l ștergem
                currentParams.delete('village_context'); // Sau setează la 'ALL_VILLAGES' dacă preferi
                currentParams.set('village_context', 'ALL_VILLAGES');
            }
            // Aplică în URL doar pe paginile relevante și dacă s-a schimbat ceva
            const newSearch = currentParams.toString();
            const oldSearch = new URLSearchParams(window.location.search).toString();

            if (newSearch !== oldSearch && (pathname.startsWith("/mayor/dashboard") || pathname.startsWith("/mayor/farmers") || pathname.startsWith("/mayor/parcels") || pathname.startsWith("/mayor/stats"))) {
                router.replace(`${pathname}?${newSearch}`, { scroll: false });
            }
        }
    }, [selectedVillageContext, managedVillages, isContextLoading, sessionStatus, router, pathname]); // removed searchParams


    const handleSetSelectedVillageContext = (village: string | null) => {
        setSelectedVillageContext(village);
    };

    const contextValue = useMemo(() => ({
        selectedVillage: selectedVillageContext,
        setSelectedVillageContext: handleSetSelectedVillageContext,
        managedVillages: managedVillages,
        isContextLoading: isContextLoading,
    }), [selectedVillageContext, managedVillages, isContextLoading]);

    if (sessionStatus === 'loading') {
        return ( /* ... schelet ... */ <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">{t.loadingSession}</span></div>);
    }
    if (sessionStatus === 'unauthenticated') {
        return ( /* ... neautorizat ... */ <div className="flex h-screen items-center justify-center"><Alert variant="destructive" className="w-auto"><AlertCircle className="h-4 w-4" /> <AlertTitle>Eroare</AlertTitle><AlertDescription>{t.unauthorized} <Link href="/" className="font-bold underline">Autentificare</Link></AlertDescription></Alert></div>);
    }

    const displayVillageInSidebar = managedVillages.length === 1 ? managedVillages[0] : managedVillages.length > 1 ? `${managedVillages.length} sate` : (sessionStatus === 'authenticated' ? "Niciun sat" : t.loadingVillages);

    return (
        <MayorVillageContext.Provider value={contextValue}>
            <SidebarProvider>
                <Sidebar> {/* Asigură-te că Sidebar folosește Sheet cu SheetHeader/Title pt mobil */}
                    <SidebarHeader>
                        <div className="flex flex-col items-start gap-2 p-2">
                            <div className="flex items-center gap-2"><Layers className="w-6 h-6 text-primary" /><span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">{t.sidebarTitle}</span></div>
                            <Badge variant="secondary" className="ml-1 group-data-[collapsible=icon]:hidden" title={managedVillages.join(', ')}>{t.managedVillagesLabel}: {displayVillageInSidebar}</Badge>
                            <Badge variant="outline" className="hidden group-data-[collapsible=icon]:inline-flex" title={managedVillages.join(', ')}><Landmark className="h-3 w-3" /></Badge>
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarMenu>
                            <SidebarMenuItem><Link href="/mayor/dashboard" className="w-full"><SidebarMenuButton tooltip={t.dashboard} isActive={pathname === '/mayor/dashboard'}><Home /><span>{t.dashboard}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/mayor/farmers" className="w-full"><SidebarMenuButton tooltip={t.manageFarmers} isActive={pathname.startsWith('/mayor/farmers')}><Users /><span>{t.manageFarmers}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/mayor/parcels" className="w-full"><SidebarMenuButton tooltip={t.manageParcels} isActive={pathname.startsWith('/mayor/parcels')}><Edit3 /><span>{t.manageParcels}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/mayor/export" className="w-full"><SidebarMenuButton tooltip={"Export Date"} isActive={pathname.startsWith('/mayor/export')}><Download /><span>Export Date</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/mayor/stats" className="w-full"><SidebarMenuButton tooltip={t.villageStats} isActive={pathname.startsWith('/mayor/stats')}><BarChartHorizontal /><span>{t.villageStats}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/mayor/account" className="w-full"><SidebarMenuButton tooltip={t.myAccount} isActive={pathname.startsWith('/mayor/account')}><Settings /><span>{t.myAccount}</span></SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/mayor/support" className="w-full"><SidebarMenuButton tooltip={t.support} isActive={pathname.startsWith('/mayor/support')}><Info /><span>{t.support}</span></SidebarMenuButton></Link></SidebarMenuItem>
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
                        {/* Selectorul de sat va fi randat doar dacă încărcarea contextului s-a terminat și există sate */}
                        {!isContextLoading && managedVillages.length > 0 && (
                            managedVillages.length === 1 ? (
                                <Badge variant="outline">{managedVillages[0]}</Badge>
                            ) : (
                                <Select
                                    value={selectedVillageContext === null ? 'ALL_VILLAGES' : selectedVillageContext || ''}
                                    onValueChange={(value) => { handleSetSelectedVillageContext(value === 'ALL_VILLAGES' ? null : value); }}
                                >
                                    <SelectTrigger className="w-auto min-w-[180px] max-w-xs">
                                        <SelectValue placeholder={t.selectVillagePlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL_VILLAGES">{t.allMyVillages} ({managedVillages.length})</SelectItem>
                                        {managedVillages.map(village => (<SelectItem key={village} value={village}>{village}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            )
                        )}
                        {/* Afișează un loader mic dacă contextul încă se încarcă și sesiunea e autentificată */}
                        {isContextLoading && sessionStatus === 'authenticated' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    </header>
                    {/* Afișează copiii (pagina) doar dacă contextul s-a încărcat */}
                    {!isContextLoading ? children : <div className="p-6"><Skeleton className="h-64 w-full" /></div>}
                </SidebarInset>
            </SidebarProvider>
        </MayorVillageContext.Provider>
    );
}