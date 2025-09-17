// src/app/mayor/parcels/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useMemo, Suspense, memo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { ParcelMap } from '@/components/maps/parcel-map';
import { getParcelsByVillages, Parcel, assignParcelsToFarmer, AssignmentResult, ParcelAssignmentConflict } from '@/services/parcels';
import { getFarmersByVillages, Farmer, getFarmerByCompanyCode } from '@/services/farmers';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPinned, AlertCircle, Edit, ListChecks, Search, XCircle, Text, List, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMayorVillageContext } from '@/components/layout/MayorLayoutClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useRouter, usePathname } from 'next/navigation';
import type { LatLngTuple } from 'leaflet';

// Componentă memoized pentru rândurile din tabel pentru performanță optimă
const ParcelTableRow = memo(({ parcel, owner, cultivator }: { 
    parcel: Parcel; 
    owner: Omit<Farmer, 'password'> | null; 
    cultivator: Omit<Farmer, 'password'> | null; 
}) => (
    <TableRow key={parcel.id}>
        <TableCell className="font-mono text-xs">{parcel.id}</TableCell>
        <TableCell>{parcel.village}</TableCell>
        <TableCell>{parcel.area.toFixed(2)}</TableCell>
        <TableCell>{owner ? owner.name : '-'}</TableCell>
        <TableCell>{cultivator ? cultivator.name : '-'}</TableCell>
    </TableRow>
));

ParcelTableRow.displayName = 'ParcelTableRow';

const t = {
    pageTitle: "Managementul parcelelor",
    pageDescriptionBase: "Vizualizați și atribuiți parcele agricultorilor",
    pageDescriptionForVillage: "pentru satul",
    pageDescriptionForAllVillages: "din toate satele gestionate.",
    selectFarmerLabel: "Selectați agricultorul",
    selectFarmerPlaceholder: "Alegeți un agricultor...",
    noFarmerSelected: "Niciun agricultor selectat",
    assignOwnedLabel: "Parcele deținute",
    assignCultivatedLabel: "Parcele cultivate",
    searchParcelPlaceholder: "Caută ID parcelă, sat, Proprietar/Arendator...",
    noParcelsInContext: "Nicio parcelă disponibilă în contextul selectat.",
    assignButton: "Atribuie parcele",
    assigningButton: "Se atribuie...",
    forceAssignmentLabel: "Forțează atribuirea (suprascrie conflictele)",
    conflictDialogTitle: "Conflicte de atribuire detectate",
    conflictDialogDescription: "Următoarele parcele sunt deja atribuite altor agricultori. Doriți să forțați atribuirea către",
    confirmForceButton: "Da, forțează atribuirea",
    cancelButton: "Anulează",
    errorTitle: "Eroare",
    successTitle: "Succes",
    parcelListTitle: "Lista parcelelor",
    parcelMapTitle: "Harta parcelelor",
    loadingData: "Se încarcă datele...",
    noVillagesManagedError: "Nu gestionați niciun sat. Atribuirea parcelelor este dezactivată.",
    assignmentModeToggleLabel: "Mod introducere parcele:",
    textInputMode: "Textual",
    listInputMode: "Listă interactivă",
    ownedParcelsTextInputPlaceholder: "Introduceți ID-urile parcelelor deținute...",
    cultivatedParcelsTextInputPlaceholder: "Introduceți ID-urile parcelelor cultivate...",
    findFarmerForAssignmentTitle: "Asociază agricultor după cod fiscal",
    companyCodeInputPlaceholder: "Introduceți codul fiscal...",
    findAndAddFarmerButton: "Caută și adaugă",
    farmerNotFound: "Agricultorul cu codul fiscal specificat nu a fost găsit.",
    farmerAlreadyInList: "Acest agricultor este deja în lista de selecție.",
    farmerAddedToListToast: "Agricultorul a fost adăugat la lista de selecție și preselectat.",
};

const getCheckboxId = (parcelId: string, type: 'owned' | 'cultivated') => `parcel-${type}-${parcelId}`;
type AssignmentMode = 'text' | 'list';
type SessionUser = { id?: string };

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

interface ParcelListItemProps {
    parcel: Parcel;
    type: 'owned' | 'cultivated';
    isChecked: boolean;
    onCheckedChange: (parcelId: string, checked: boolean) => void;
    isAssigning: boolean;
    selectedFarmerId?: string;
    farmersInContext: Omit<Farmer, 'password'>[];
}

const ParcelListItem = memo(({ parcel, type, isChecked, onCheckedChange, isAssigning, selectedFarmerId, farmersInContext }: ParcelListItemProps) => {
    const checkboxId = getCheckboxId(parcel.id, type);
    let badgeText: string | null = null;
    if (type === 'owned' && parcel.ownerId && parcel.ownerId !== selectedFarmerId) {
        const owner = farmersInContext.find(f => f.id === parcel.ownerId);
        badgeText = `Deținut: ${owner?.name.substring(0, 10) || 'Altcineva'}...`;
    } else if (type === 'cultivated' && parcel.cultivatorId && parcel.cultivatorId !== selectedFarmerId) {
        const cultivator = farmersInContext.find(f => f.id === parcel.cultivatorId);
        badgeText = `Cultivat: ${cultivator?.name.substring(0, 10) || 'Altcineva'}...`;
    }
    return (
        <div className="flex items-center space-x-2 py-1">
            <Checkbox
                id={checkboxId}
                checked={isChecked}
                onCheckedChange={(checked) => onCheckedChange(parcel.id, !!checked)}
                disabled={isAssigning}
            />
            <label htmlFor={checkboxId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">
                {parcel.id} <span className="text-xs text-muted-foreground">({parcel.village}, {parcel.area.toFixed(2)} ha)</span>
                {badgeText && <Badge variant="outline" className="ml-2 text-xs font-normal">{badgeText}</Badge>}
            </label>
        </div>
    );
});
ParcelListItem.displayName = 'ParcelListItem';


export default function MayorParcelsPage() {
    const { data: session, status: sessionStatus } = useSession();
    const { selectedVillage, managedVillages, isContextLoading } = useMayorVillageContext();
    const { toast } = useToast();
    // const searchParams = useSearchParams(); // temporarily disabled for build
    const router = useRouter();
    const pathname = usePathname();

    const [allParcelsInContext, setAllParcelsInContext] = useState<Parcel[]>([]);
    const [filteredParcelsForTable, setFilteredParcelsForTable] = useState<Parcel[]>([]);
    const [farmersInContext, setFarmersInContext] = useState<Omit<Farmer, 'password'>[]>([]);

    const [selectedFarmerId, setSelectedFarmerId] = useState<string | undefined>(undefined);
    const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('text');
    const [ownedParcelIdsSet, setOwnedParcelIdsSet] = useState<Set<string>>(new Set());
    const [cultivatedParcelIdsSet, setCultivatedParcelIdsSet] = useState<Set<string>>(new Set());
    const [ownedParcelsTextInput, setOwnedParcelsTextInput] = useState<string>('');
    const [cultivatedParcelsTextInput, setCultivatedParcelsTextInput] = useState<string>('');

    const [parcelListSearchTerm, setParcelListSearchTerm] = useState('');
    const debouncedParcelListSearchTerm = useDebounce(parcelListSearchTerm, 300);
    const [tableSearchTerm, setTableSearchTerm] = useState('');
    const debouncedTableSearchTerm = useDebounce(tableSearchTerm, 300);

    const [forceAssignment, setForceAssignment] = useState(false);

    const [loadingData, setLoadingData] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);
    const [processingParcels, setProcessingParcels] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [showNoVillagesError, setShowNoVillagesError] = useState(false);
    const [lastFetchKey, setLastFetchKey] = useState<string>('');

    const [assignmentConflicts, setAssignmentConflicts] = useState<ParcelAssignmentConflict[]>([]);
    const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);

    const [findFarmerByCodeInput, setFindFarmerByCodeInput] = useState('');
    const [debouncedFindInput, setDebouncedFindInput] = useState('');
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isFindingFarmer, setIsFindingFarmer] = useState(false);

    const typedUser = session?.user as SessionUser | undefined;

    const fetchData = useCallback(async () => {
        if (isContextLoading || sessionStatus !== 'authenticated' || !typedUser?.id) {
            if (!isContextLoading && sessionStatus !== 'loading') setLoadingData(false);
            return;
        }
        if (managedVillages.length === 0) {
            setShowNoVillagesError(true);
            setLoadingData(false);
            setAllParcelsInContext([]);
            setFilteredParcelsForTable([]);
            setFarmersInContext([]);
            return;
        }
        setShowNoVillagesError(false);
        setLoadingData(true);
        setError(null);

        const villagesToFetch = selectedVillage ? [selectedVillage] : managedVillages;
        const villagesToFetchKey = villagesToFetch.join(',');

        // Evită re-fetch-ul dacă se încearcă să se încarce aceleași date
        if (lastFetchKey === villagesToFetchKey && !error && allParcelsInContext.length > 0) {
            console.log(`[MayorParcels] Skipping re-fetch for same villages: ${villagesToFetchKey}`);
            setLoadingData(false);
            return;
        }

        console.log(`[MayorParcels] Fetching data for villages: ${villagesToFetchKey}`);
        setLastFetchKey(villagesToFetchKey);

        try {
            const [parcelsData, farmersData] = await Promise.all([
                getParcelsByVillages(villagesToFetch),
                getFarmersByVillages(villagesToFetch)
            ]);

            setAllParcelsInContext(parcelsData);
            setFilteredParcelsForTable(parcelsData);
            setFarmersInContext(farmersData.sort((a, b) => a.name.localeCompare(b.name)));

        } catch (err) {
            console.error("Error fetching parcels/farmers data:", err);
            setError(err instanceof Error ? err.message : "A apărut o eroare la încărcarea datelor.");
        } finally {
            setLoadingData(false);
        }
    }, [isContextLoading, sessionStatus, typedUser?.id, managedVillages.join(','), selectedVillage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setSelectedFarmerId(undefined);
        setOwnedParcelIdsSet(new Set());
        setCultivatedParcelIdsSet(new Set());
        setOwnedParcelsTextInput('');
        setCultivatedParcelsTextInput('');
        setForceAssignment(false);
        setParcelListSearchTerm('');
    }, [selectedVillage, managedVillages]);

    useEffect(() => {
        if (selectedFarmerId && allParcelsInContext.length > 0) {
            const farmerOwned = allParcelsInContext
                .filter(p => p.ownerId === selectedFarmerId)
                .map(p => p.id);
            const farmerCultivated = allParcelsInContext
                .filter(p => p.cultivatorId === selectedFarmerId)
                .map(p => p.id);

            setOwnedParcelIdsSet(new Set(farmerOwned));
            setCultivatedParcelIdsSet(new Set(farmerCultivated));
            setOwnedParcelsTextInput(farmerOwned.join(', '));
            setCultivatedParcelsTextInput(farmerCultivated.join(', '));
        } else {
            setOwnedParcelIdsSet(new Set());
            setCultivatedParcelIdsSet(new Set());
            setOwnedParcelsTextInput('');
            setCultivatedParcelsTextInput('');
        }
    }, [selectedFarmerId, allParcelsInContext]);

    const parseParcelIdsFromString = (text: string): Set<string> => {
        if (!text.trim()) return new Set();
        return new Set(text.split(/[\s,\n]+/).map(id => id.trim()).filter(id => id.length > 0));
    };

    useEffect(() => {
        if (assignmentMode === 'text') {
            setOwnedParcelIdsSet(parseParcelIdsFromString(ownedParcelsTextInput));
        }
    }, [ownedParcelsTextInput, assignmentMode]);

    useEffect(() => {
        if (assignmentMode === 'text') {
            setCultivatedParcelIdsSet(parseParcelIdsFromString(cultivatedParcelsTextInput));
        }
    }, [cultivatedParcelsTextInput, assignmentMode]);

    const filteredParcelsForAssignmentList = useMemo(() => {
        if (!debouncedParcelListSearchTerm) return allParcelsInContext;
        return allParcelsInContext.filter(p =>
            p.id.toLowerCase().includes(debouncedParcelListSearchTerm.toLowerCase()) ||
            p.village.toLowerCase().includes(debouncedParcelListSearchTerm.toLowerCase())
        );
    }, [debouncedParcelListSearchTerm, allParcelsInContext]);

    useEffect(() => {
        if (!debouncedTableSearchTerm) {
            setFilteredParcelsForTable(allParcelsInContext);
        } else {
            setFilteredParcelsForTable(
                allParcelsInContext.filter(p =>
                    p.id.toLowerCase().includes(debouncedTableSearchTerm.toLowerCase()) ||
                    p.village.toLowerCase().includes(debouncedTableSearchTerm.toLowerCase()) ||
                    (p.ownerId && farmersInContext.find(f => f.id === p.ownerId)?.name.toLowerCase().includes(debouncedTableSearchTerm.toLowerCase())) ||
                    (p.cultivatorId && farmersInContext.find(f => f.id === p.cultivatorId)?.name.toLowerCase().includes(debouncedTableSearchTerm.toLowerCase()))
                )
            );
        }
    }, [debouncedTableSearchTerm, allParcelsInContext, farmersInContext]);

    const handleOwnedCheckboxChange = (parcelId: string, checked: boolean) => {
        setOwnedParcelIdsSet(prev => {
            const next = new Set(prev);
            if (checked) next.add(parcelId);
            else next.delete(parcelId);
            if (assignmentMode === 'list') {
                setOwnedParcelsTextInput(Array.from(next).join(', '));
            }
            return next;
        });
    };

    const handleCultivatedCheckboxChange = (parcelId: string, checked: boolean) => {
        setCultivatedParcelIdsSet(prev => {
            const next = new Set(prev);
            if (checked) next.add(parcelId);
            else next.delete(parcelId);
            if (assignmentMode === 'list') {
                setCultivatedParcelsTextInput(Array.from(next).join(', '));
            }
            return next;
        });
    };

    const submitAssignment = async (force: boolean) => {
        const actorId = typedUser?.id;
        if (!selectedFarmerId || !actorId) {
            toast({ variant: "destructive", title: t.errorTitle, description: "Agricultor sau primar neidentificat." });
            return;
        }
        setIsAssigning(true);
        setAssignmentConflicts([]);

        const finalOwnedIds = Array.from(ownedParcelIdsSet);
        const finalCultivatedIds = Array.from(cultivatedParcelIdsSet);
        
        // Păstrează o copie a stării originale pentru rollback
        const originalParcels = [...allParcelsInContext];
        const originalOwnedIds = new Set(finalOwnedIds);
        const originalCultivatedIds = new Set(finalCultivatedIds);
        
        // Marchează parcelele ca fiind în curs de procesare
        setProcessingParcels(new Set([...finalOwnedIds, ...finalCultivatedIds]));

        // Optimistic update - actualizăm UI-ul instant
        const optimisticParcels = allParcelsInContext.map(parcel => {
            if (finalOwnedIds.includes(parcel.id)) {
                return { ...parcel, ownerId: selectedFarmerId };
            }
            if (finalCultivatedIds.includes(parcel.id)) {
                return { ...parcel, cultivatorId: selectedFarmerId };
            }
            return parcel;
        });
        setAllParcelsInContext(optimisticParcels);

        // Reset selection pentru feedback instant
        setOwnedParcelIdsSet(new Set());
        setCultivatedParcelIdsSet(new Set());

        try {
            const result: AssignmentResult = await assignParcelsToFarmer(selectedFarmerId, finalOwnedIds, finalCultivatedIds, actorId, force);

            if (result.success) {
                toast({ 
                    title: t.successTitle, 
                    description: result.message || "Parcelele au fost atribuite cu succes.",
                    duration: 2000
                });
                // Update-ul optimist este păstrat
            } else if (result.conflicts && result.conflicts.length > 0) {
                // Revert optimistic update în caz de conflict
                setAllParcelsInContext(originalParcels);
                setOwnedParcelIdsSet(originalOwnedIds);
                setCultivatedParcelIdsSet(originalCultivatedIds);
                setAssignmentConflicts(result.conflicts);
                setIsConflictDialogOpen(true);
            } else {
                // Revert optimistic update în caz de eroare
                setAllParcelsInContext(originalParcels);
                setOwnedParcelIdsSet(originalOwnedIds);
                setCultivatedParcelIdsSet(originalCultivatedIds);
                throw new Error(result.error || "A apărut o eroare la atribuirea parcelelor.");
            }
        } catch (err) {
            console.error("Error assigning parcels:", err);
            // Revert optimistic update în caz de eroare
            setAllParcelsInContext(originalParcels);
            setOwnedParcelIdsSet(originalOwnedIds);
            setCultivatedParcelIdsSet(originalCultivatedIds);
            toast({ 
                variant: "destructive", 
                title: t.errorTitle, 
                description: err instanceof Error ? err.message : "Eroare necunoscută.",
                duration: 4000
            });
        } finally {
            setIsAssigning(false);
            setProcessingParcels(new Set()); // Curăță setul de parcele în procesare
        }
    };

    const handleAssignmentSubmit = () => { 
        // Feedback instant pentru utilizator
        if (!isAssigning && selectedFarmerId && (ownedParcelIdsSet.size > 0 || cultivatedParcelIdsSet.size > 0)) {
            toast({ 
                title: "Procesare...", 
                description: "Se atribuie parcelele...",
                duration: 1000
            });
        }
        submitAssignment(forceAssignment); 
    };
    const handleForceAssignmentConfirm = () => { setIsConflictDialogOpen(false); submitAssignment(true); };

    const handleFindAndAddFarmer = useCallback(async (codeToFind?: string) => {
        const code = (codeToFind || findFarmerByCodeInput).trim();
        if (!code) {
            toast({ variant: "destructive", title: t.errorTitle, description: "Introduceți un cod fiscal." });
            return;
        }
        setIsFindingFarmer(true);
        try {
            const farmer = await getFarmerByCompanyCode(code);
            if (farmer) {
                if (!farmersInContext.some(f => f.id === farmer.id)) {
                    setFarmersInContext(prev => [...prev, farmer as Omit<Farmer, 'password'>].sort((a, b) => a.name.localeCompare(b.name)));
                    setSelectedFarmerId(farmer.id);
                    toast({ title: t.successTitle, description: t.farmerAddedToListToast });
                } else {
                    setSelectedFarmerId(farmer.id);
                    toast({ variant: "default", title: "Info", description: t.farmerAlreadyInList });
                }
                setFindFarmerByCodeInput('');
            } else {
                toast({ variant: "destructive", title: t.errorTitle, description: t.farmerNotFound });
            }
        } catch (error) {
            toast({ variant: "destructive", title: t.errorTitle, description: "Eroare la căutarea agricultorului." });
        } finally {
            setIsFindingFarmer(false);
        }
    }, [findFarmerByCodeInput, farmersInContext, toast]);

    useEffect(() => {
        // const farmerCodeToFind = searchParams.get('find_farmer_code'); // temporarily disabled
        const farmerCodeToFind = null;
        if (farmerCodeToFind && !isFindingFarmer && !loadingData) {
            handleFindAndAddFarmer(farmerCodeToFind);
            // Elimină parametrul din URL pentru a nu se re-executa la refresh
            // const newParams = new URLSearchParams(searchParams.toString()); // temporarily disabled
            const newParams = new URLSearchParams();
            newParams.delete('find_farmer_code');
            router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
        }
    }, [isFindingFarmer, loadingData, handleFindAndAddFarmer, router, pathname]); // removed searchParams dependency

    // Debouncing pentru căutarea de agricultori
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(() => {
            setDebouncedFindInput(findFarmerByCodeInput);
        }, 300); // 300ms debounce

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [findFarmerByCodeInput]);

    const pageDescriptionText = selectedVillage
        ? `${t.pageDescriptionBase} ${t.pageDescriptionForVillage} ${selectedVillage}.`
        : `${t.pageDescriptionBase} ${t.pageDescriptionForAllVillages}`;
    const contextDisplay = selectedVillage ? `satul ${selectedVillage}` : "satele gestionate";
    const farmerForConflictDialog = useMemo(() => farmersInContext.find(f => f.id === selectedFarmerId), [selectedFarmerId, farmersInContext]);

    // Memoizăm tabelul cu parcele pentru performanță
    const memoizedParcelTableRows = useMemo(() => {
        const farmersMap = new Map(farmersInContext.map(f => [f.id, f]));
        
        return filteredParcelsForTable.map(p => {
            const owner = p.ownerId ? farmersMap.get(p.ownerId) || null : null;
            const cultivator = p.cultivatorId ? farmersMap.get(p.cultivatorId) || null : null;
            return (
                <ParcelTableRow 
                    key={p.id}
                    parcel={p}
                    owner={owner}
                    cultivator={cultivator}
                />
            );
        });
    }, [filteredParcelsForTable, farmersInContext]);

    if (loadingData || isContextLoading || sessionStatus === 'loading') {
        return (
            <div className="flex-1 p-4 sm:p-6 space-y-6">
                <Card className="shadow-md">
                    <CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-1" /></CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-80 w-full" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (showNoVillagesError) {
        return (<div className="flex-1 p-4 sm:p-6"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /> <AlertTitle>{t.errorTitle}</AlertTitle><AlertDescription>{t.noVillagesManagedError}</AlertDescription></Alert></div>);
    }
    if (error) {
        return (<div className="flex-1 p-4 sm:p-6"><Alert variant="destructive"> <AlertCircle className="h-4 w-4" /><AlertTitle>{t.errorTitle}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div>);
    }

    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> {t.pageTitle}</CardTitle>
                    <CardDescription>{pageDescriptionText}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* MODIFICARE: Secțiunea de atribuire este primul card */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <CardTitle className="text-lg">Atribuire către agricultor</CardTitle>
                                <div className="flex items-center space-x-2">
                                    <Label htmlFor="assignment-mode-toggle" className="text-sm font-medium flex items-center gap-1">
                                        {assignmentMode === 'text' ? <Text className="h-4 w-4" /> : <List className="h-4 w-4" />}
                                        Mod {assignmentMode === 'text' ? 'Textual' : 'Listă'}
                                    </Label>
                                    <Switch id="assignment-mode-toggle" checked={assignmentMode === 'list'} onCheckedChange={(checked) => setAssignmentMode(checked ? 'list' : 'text')} aria-label={t.assignmentModeToggleLabel} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="farmer-select">{t.selectFarmerLabel}</Label>
                                <Select value={selectedFarmerId} onValueChange={setSelectedFarmerId} disabled={isAssigning || farmersInContext.length === 0}>
                                    <SelectTrigger id="farmer-select">
                                        <SelectValue placeholder={farmersInContext.length === 0 ? "Nu sunt agricultori în listă..." : t.selectFarmerPlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Agricultori {selectedVillage ? `din ${selectedVillage}` : `din satele gestionate`}</SelectLabel>
                                            {farmersInContext.map(farmer => (
                                                <SelectItem key={farmer.id} value={farmer.id}>
                                                    {farmer.name} ({farmer.companyCode})
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedFarmerId && (
                                <>
                                    {assignmentMode === 'text' && (
                                        <>
                                            <div> <Label htmlFor="owned-parcels-text" className="mb-1 block">{t.assignOwnedLabel}</Label> <Textarea id="owned-parcels-text" value={ownedParcelsTextInput} onChange={(e) => setOwnedParcelsTextInput(e.target.value)} placeholder={t.ownedParcelsTextInputPlaceholder} rows={3} disabled={isAssigning} className="font-mono text-xs" /> </div>
                                            <div> <Label htmlFor="cultivated-parcels-text" className="mb-1 block">{t.assignCultivatedLabel}</Label> <Textarea id="cultivated-parcels-text" value={cultivatedParcelsTextInput} onChange={(e) => setCultivatedParcelsTextInput(e.target.value)} placeholder={t.cultivatedParcelsTextInputPlaceholder} rows={3} disabled={isAssigning} className="font-mono text-xs" /> </div>
                                        </>
                                    )}
                                    {assignmentMode === 'list' && (
                                        <>
                                            <div>
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <Label>{t.assignOwnedLabel}</Label>
                                                    <Input type="search" placeholder="Filtrează parcele..." value={parcelListSearchTerm} onChange={e => setParcelListSearchTerm(e.target.value)} className="h-8 text-xs max-w-xs" />
                                                </div>
                                                <ScrollArea className="h-40 rounded-md border p-2">
                                                    {filteredParcelsForAssignmentList.length > 0 ? filteredParcelsForAssignmentList.map(parcel => (
                                                        <ParcelListItem key={`owned-${parcel.id}`} parcel={parcel} type="owned" isChecked={ownedParcelIdsSet.has(parcel.id)} onCheckedChange={handleOwnedCheckboxChange} isAssigning={isAssigning} selectedFarmerId={selectedFarmerId} farmersInContext={farmersInContext} />
                                                    )) : <p className="text-sm text-muted-foreground p-2">{t.noParcelsInContext}</p>}
                                                </ScrollArea>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <Label>{t.assignCultivatedLabel}</Label>
                                                </div>
                                                <ScrollArea className="h-40 rounded-md border p-2">
                                                    {filteredParcelsForAssignmentList.length > 0 ? filteredParcelsForAssignmentList.map(parcel => (
                                                        <ParcelListItem key={`cultivated-${parcel.id}`} parcel={parcel} type="cultivated" isChecked={cultivatedParcelIdsSet.has(parcel.id)} onCheckedChange={handleCultivatedCheckboxChange} isAssigning={isAssigning} selectedFarmerId={selectedFarmerId} farmersInContext={farmersInContext} />
                                                    )) : <p className="text-sm text-muted-foreground p-2">{t.noParcelsInContext}</p>}
                                                </ScrollArea>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex items-center space-x-2 pt-2">
                                        <Checkbox id="force-assignment-cb" checked={forceAssignment} onCheckedChange={(checked) => setForceAssignment(!!checked)} disabled={isAssigning} />
                                        <Label htmlFor="force-assignment-cb" className="text-sm font-medium">{t.forceAssignmentLabel}</Label>
                                    </div>
                                    <Button onClick={handleAssignmentSubmit} disabled={isAssigning || !selectedFarmerId} className="w-full">
                                        {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isAssigning ? t.assigningButton : t.assignButton}
                                    </Button>
                                </>
                            )}
                            {!selectedFarmerId && farmersInContext.length > 0 && <p className="text-sm text-muted-foreground p-2">{t.noFarmerSelected}</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><MapPinned className="h-5 w-5" />{t.parcelMapTitle} ({contextDisplay})</CardTitle>
                            <CardDescription>Vizualizați locația parcelelor.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[450px] w-full rounded-md border bg-muted">
                                <Suspense fallback={<Skeleton className="h-full w-full" />}>
                                    <ParcelMap
                                        parcels={filteredParcelsForTable}
                                        farmers={farmersInContext}
                                        selectedFarmerId={selectedFarmerId}
                                        highlightMode={selectedFarmerId ? "farmer" : "none"}
                                        centerCoordinates={filteredParcelsForTable.length > 0 && filteredParcelsForTable[0].coordinates.length > 0 ? [filteredParcelsForTable[0].coordinates[0][1], filteredParcelsForTable[0].coordinates[0][0]] as LatLngTuple : [47.0105, 28.8638]}
                                        initialZoom={selectedVillage ? 13 : 10}
                                    />
                                </Suspense>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><ListChecks className="h-5 w-5" />{t.parcelListTitle} ({contextDisplay})</CardTitle>
                            <div className="relative mt-2">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="search" placeholder={t.searchParcelPlaceholder} value={tableSearchTerm} onChange={(e) => setTableSearchTerm(e.target.value)} className="pl-8 w-full sm:w-64" />
                                {tableSearchTerm && <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setTableSearchTerm('')}><XCircle className="h-4 w-4" /></Button>}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px] rounded-md border">
                                {filteredParcelsForTable.length > 0 ? (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>ID Parcelă</TableHead><TableHead>Sat</TableHead><TableHead>Suprafață (ha)</TableHead><TableHead>Proprietar/Arendator</TableHead><TableHead>Cultivator</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {memoizedParcelTableRows}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="p-4 text-center text-sm text-muted-foreground">
                                        {allParcelsInContext.length === 0 ? t.noParcelsInContext : "Nicio parcelă nu corespunde criteriilor de căutare."}
                                    </p>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.conflictDialogTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                            <p className="mb-2">{t.conflictDialogDescription} <strong>{farmerForConflictDialog?.name || 'agricultorul selectat'}</strong>?</p>
                            <ScrollArea className="max-h-60 mt-2">
                                <ul className="list-disc space-y-1 pl-5 text-sm">
                                    {assignmentConflicts.map(conflict => (
                                        <li key={conflict.parcelId}>
                                            Parcela <code className="font-mono bg-muted px-1 py-0.5 rounded">{conflict.parcelId}</code> ({conflict.village}):
                                            {conflict.attemptedAssignmentType === 'owner' && conflict.currentOwnerName && ` deținută de ${conflict.currentOwnerName}.`}
                                            {conflict.attemptedAssignmentType === 'cultivator' && conflict.currentCultivatorName && ` cultivată de ${conflict.currentCultivatorName}.`}
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setIsConflictDialogOpen(false); setAssignmentConflicts([]); }} disabled={isAssigning}>{t.cancelButton}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleForceAssignmentConfirm} disabled={isAssigning} className="bg-destructive hover:bg-destructive/90">
                            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.confirmForceButton}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}