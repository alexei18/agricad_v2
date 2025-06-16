// src/app/mayor/export/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Adăugat useMemo
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Eliminat SelectGroup, SelectLabel dacă nu sunt folosite direct
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, FileSpreadsheet, FileType as FileIconLucide, Loader2, AlertCircle, Users, ListFilter, MapPin } from 'lucide-react';
import { useMayorVillageContext } from '@/components/layout/MayorLayoutClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Farmer, getFarmersByVillages } from '@/services/farmers';
import { ScrollArea } from '@/components/ui/scroll-area';
// Importăm doar funcția de acțiune server
import { exportMayorDataAction } from './actions';

// Definim constanta și tipul aici, în componenta client
export const availableMayorExportColumns = [
    { key: 'parcelId', label: 'ID Parcelă', defaultSelected: true },
    { key: 'parcelVillage', label: 'Sat Parcelă', defaultSelected: true },
    { key: 'parcelArea', label: 'Suprafață Parcelă (ha)', defaultSelected: true },
    { key: 'ownerName', label: 'Nume Proprietar/Arendator', defaultSelected: true },
    { key: 'ownerCode', label: 'Cod Fiscal Proprietar/Arendator', defaultSelected: false },
    { key: 'cultivatorName', label: 'Nume Cultivator', defaultSelected: false },
    { key: 'cultivatorCode', label: 'Cod Fiscal Cultivator', defaultSelected: false },
] as const;

export type MayorExportDataKey = typeof availableMayorExportColumns[number]['key'];


const t = {
    pageTitle: "Export date primărie",
    pageDescription: "Generați rapoarte personalizate cu date despre parcele și agricultori.",
    selectVillagesLabel: "Selectați satele pentru export",
    allManagedVillagesOption: "Toate satele gestionate",
    selectFarmersLabel: "Selectați agricultorii (opțional, implicit toți din satele alese)",
    allFarmersInContextOption: "Toți agricultorii din satele selectate",
    noFarmersInContext: "Nu sunt agricultori în satele selectate.",
    selectColumnsToExportLabel: "Selectați coloanele de exportat pentru parcele:",
    selectFormatLabel: "Selectați formatul de export:",
    excelFormat: "Excel (.xlsx)",
    pdfFormat: "PDF (.pdf)",
    wordFormat: "Word (.docx)",
    exportButton: "Generează și descarcă",
    exportingButton: "Se generează...",
    errorTitle: "Eroare",
    successTitle: "Succes",
    noDataToExport: "Nu există date de exportat conform selecției curente.",
    noVillagesManaged: "Nu gestionați niciun sat.",
    exportInitiated: "Generarea exportului a început. Descărcarea va începe automat.",
    exportFailed: "Generarea exportului a eșuat.",
    selectAtLeastOneColumn: "Selectați cel puțin o coloană pentru export."
};

type ExportFormat = 'xlsx' | 'pdf' | 'docx';
type SessionUser = { id?: string };

export default function MayorExportPage() {
    const { data: session, status: sessionStatus } = useSession();
    const { managedVillages, isContextLoading: isMayorContextLoading, selectedVillage } = useMayorVillageContext();
    const { toast } = useToast();

    // Inițializăm targetVillages cu satul din context dacă există, altfel cu toate satele gestionate
    const [targetVillages, setTargetVillages] = useState<string[]>([]);
    const [availableFarmers, setAvailableFarmers] = useState<Omit<Farmer, 'password'>[]>([]);
    const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);

    const [selectedColumns, setSelectedColumns] = useState<MayorExportDataKey[]>(
        availableMayorExportColumns.filter(col => col.defaultSelected).map(col => col.key)
    );
    const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');

    const [isExporting, setIsExporting] = useState(false);
    const [loadingPageData, setLoadingPageData] = useState(true);

    const typedUser = session?.user as SessionUser | undefined;

    useEffect(() => {
        if (!isMayorContextLoading && sessionStatus === 'authenticated') {
            if (managedVillages.length > 0) {
                // Dacă un sat specific e în contextul global al primarului, îl preselectăm
                // Altfel, preselectăm toate satele gestionate
                setTargetVillages(selectedVillage && managedVillages.includes(selectedVillage) ? [selectedVillage] : [...managedVillages]);
            } else {
                setTargetVillages([]);
            }
            setLoadingPageData(false);
        } else if (!isMayorContextLoading && sessionStatus !== 'loading') {
            setLoadingPageData(false);
        }
    }, [isMayorContextLoading, sessionStatus, managedVillages, selectedVillage]);

    useEffect(() => {
        const fetchFarmersForExport = async () => {
            if (targetVillages.length > 0) {
                setLoadingPageData(true); // Arătăm încărcare pentru fermieri
                try {
                    const farmers = await getFarmersByVillages(targetVillages);
                    setAvailableFarmers(farmers.sort((a, b) => a.name.localeCompare(b.name)));
                    // Reselectăm toți fermierii din noul context de sate, dacă e cazul
                    setSelectedFarmerIds([]); // Sau păstrăm selecția dacă fermierii încă există
                } catch (error) {
                    toast({ variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca agricultorii." });
                    setAvailableFarmers([]);
                } finally {
                    setLoadingPageData(false);
                }
            } else {
                setAvailableFarmers([]);
                setSelectedFarmerIds([]); // Golește selecția dacă nu sunt sate
                setLoadingPageData(false);
            }
        };
        if (!isMayorContextLoading) {
            fetchFarmersForExport();
        }
    }, [targetVillages, toast, isMayorContextLoading]);

    const handleColumnSelectionChange = (columnKey: MayorExportDataKey, checked: boolean) => {
        setSelectedColumns(prev =>
            checked ? [...new Set([...prev, columnKey])] : prev.filter(key => key !== columnKey)
        );
    };

    const handleFarmerSelectionChange = (farmerId: string, checked: boolean) => {
        setSelectedFarmerIds(prev =>
            checked ? [...new Set([...prev, farmerId])] : prev.filter(id => id !== farmerId)
        );
    };

    const handleSelectAllFarmers = (checked: boolean) => {
        setSelectedFarmerIds(checked ? availableFarmers.map(f => f.id) : []);
    };

    const handleExport = async () => { /* ... la fel ca înainte, dar verifică selectedColumns ... */
        if (!typedUser?.id) { toast({ variant: "destructive", title: t.errorTitle, description: "Utilizator neautentificat." }); return; }
        if (targetVillages.length === 0) { toast({ variant: "destructive", title: t.errorTitle, description: "Selectați cel puțin un sat." }); return; }
        if (selectedColumns.length === 0) { toast({ variant: "destructive", title: t.errorTitle, description: t.selectAtLeastOneColumn }); return; }

        setIsExporting(true);
        try {
            const result = await exportMayorDataAction({ mayorId: typedUser.id, filterVillages: targetVillages, filterFarmerIds: selectedFarmerIds, selectedColumns, format: exportFormat });
            if (result.success && result.fileData && result.fileName && result.contentType) {
                const byteArray = new Uint8Array(result.fileData.data);
                const blob = new Blob([byteArray], { type: result.contentType });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = result.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                toast({ title: t.successTitle, description: t.exportInitiated });
            } else { throw new Error(result.error || t.exportFailed); }
        } catch (error) {
            console.error("Export failed:", error); toast({ variant: "destructive", title: t.errorTitle, description: error instanceof Error ? error.message : t.exportFailed });
        } finally { setIsExporting(false); }
    };

    if (loadingPageData || isMayorContextLoading || sessionStatus === 'loading') { /* ... schelet ... */ return <div className="flex-1 p-4 sm:p-6"><Skeleton className="h-screen w-full" /></div>; }
    if (sessionStatus === 'unauthenticated') { /* ... neautentificat ... */ return <div className="flex-1 p-4 sm:p-6"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Acces Nepermis</AlertTitle><AlertDescription>Trebuie să fiți autentificat.</AlertDescription></Alert></div>; }
    if (managedVillages.length === 0 && !isMayorContextLoading) { /* ... fără sate gestionate ... */ return <div className="flex-1 p-4 sm:p-6"><Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Informație</AlertTitle><AlertDescription>{t.noVillagesManaged}</AlertDescription></Alert></div>; }

    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> {t.pageTitle}</CardTitle>
                    <CardDescription>{t.pageDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 max-w-2xl mx-auto">
                    <div className="space-y-4 p-4 border rounded-md">
                        <h3 className="text-md font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" />Filtru Jurisdicție</h3>
                        <div>
                            <Label>{t.selectVillagesLabel} (Bifați satele dorite)</Label>
                            {managedVillages.length === 0 && <p className="text-sm text-muted-foreground">Nu gestionați niciun sat.</p>}
                            <ScrollArea className="h-32 rounded-md border mt-1">
                                <div className="p-2 space-y-1">
                                    {managedVillages.length > 1 && (
                                        <div className="flex items-center space-x-2 py-1 border-b mb-1">
                                            <Checkbox
                                                id="select-all-villages-mayor"
                                                checked={targetVillages.length === managedVillages.length}
                                                onCheckedChange={(checked) => setTargetVillages(checked ? [...managedVillages] : [])}
                                                disabled={isExporting}
                                            />
                                            <Label htmlFor="select-all-villages-mayor" className="font-medium text-sm">Selectează/Deselectează toate satele</Label>
                                        </div>
                                    )}
                                    {managedVillages.map(village => (
                                        <div key={village} className="flex items-center space-x-2">
                                            <Checkbox id={`village-cb-mayor-${village}`} checked={targetVillages.includes(village)} onCheckedChange={(checked) => { setTargetVillages(prev => checked ? [...new Set([...prev, village])] : prev.filter(v => v !== village)); }} disabled={isExporting} />
                                            <Label htmlFor={`village-cb-mayor-${village}`} className="font-normal text-sm">{village}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        <div>
                            <Label>{t.selectFarmersLabel}</Label>
                            {loadingPageData && targetVillages.length > 0 && <Loader2 className="h-4 w-4 animate-spin my-2" />}
                            {!loadingPageData && targetVillages.length > 0 && availableFarmers.length > 0 ? (
                                <>
                                    <div className="flex items-center space-x-2 my-1">
                                        <Checkbox id="select-all-farmers-mayor" checked={selectedFarmerIds.length === availableFarmers.length && availableFarmers.length > 0} onCheckedChange={(checked) => handleSelectAllFarmers(!!checked)} disabled={isExporting} />
                                        <Label htmlFor="select-all-farmers-mayor" className="font-normal text-sm">{t.allFarmersInContextOption}</Label>
                                    </div>
                                    <ScrollArea className="h-40 rounded-md border p-2">
                                        {availableFarmers.map(farmer => (
                                            <div key={farmer.id} className="flex items-center space-x-2 py-1">
                                                <Checkbox id={`farmer-cb-mayor-${farmer.id}`} checked={selectedFarmerIds.includes(farmer.id)} onCheckedChange={(checked) => handleFarmerSelectionChange(farmer.id, !!checked)} disabled={isExporting} />
                                                <Label htmlFor={`farmer-cb-mayor-${farmer.id}`} className="text-sm font-normal">{farmer.name} ({farmer.companyCode})</Label>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground mt-1">{targetVillages.length > 0 ? t.noFarmersInContext : "Selectați sate pentru a încărca lista de agricultori."}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 p-4 border rounded-md">
                        <Label className="text-md font-semibold flex items-center gap-2"><ListFilter className="h-4 w-4" />{t.selectColumnsToExportLabel}</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-1 max-h-48 overflow-y-auto">
                            {availableMayorExportColumns.map(col => (
                                <div key={col.key} className="flex items-center space-x-2">
                                    <Checkbox id={`col-mayor-${col.key}`} checked={selectedColumns.includes(col.key)} onCheckedChange={(checked) => handleColumnSelectionChange(col.key, !!checked)} disabled={isExporting} />
                                    <Label htmlFor={`col-mayor-${col.key}`} className="font-normal text-sm">{col.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 p-4 border rounded-md">
                        <h3 className="text-md font-semibold">Format și Generare</h3>
                        <div>
                            <Label htmlFor="format-select-mayor">{t.selectFormatLabel}</Label>
                            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)} disabled={isExporting}>
                                <SelectTrigger id="format-select-mayor"> <SelectValue placeholder="Alege formatul..." /> </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="xlsx"><FileSpreadsheet className="inline-block mr-2 h-4 w-4" />{t.excelFormat}</SelectItem>
                                    <SelectItem value="pdf"><FileIconLucide className="inline-block mr-2 h-4 w-4" />{t.pdfFormat}</SelectItem>
                                    <SelectItem value="docx"><FileText className="inline-block mr-2 h-4 w-4" />{t.wordFormat}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleExport} disabled={isExporting || targetVillages.length === 0 || selectedColumns.length === 0} className="w-full">
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {isExporting ? t.exportingButton : t.exportButton}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}