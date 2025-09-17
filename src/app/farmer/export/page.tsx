// src/app/farmer/export/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Adăugat useMemo
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, FileSpreadsheet, FileType as FileIconLucide, Loader2, AlertCircle, ListFilter } from 'lucide-react';
import { useFarmerVillageContext } from '@/components/layout/FarmerLayoutClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { exportFarmerDataAction } from './actions'; // Importul acțiunii server

// Definim constanta și tipul aici, în componenta client
export const availableExportColumns = [
    { key: 'id', label: 'ID Parcelă', defaultSelected: true },
    { key: 'village', label: 'Sat', defaultSelected: true },
    { key: 'area', label: 'Suprafață (ha)', defaultSelected: true },
    { key: 'assignmentType', label: 'Tip Atribuire (față de dvs.)', defaultSelected: true },
] as const;

export type ParcelDataExportKey = typeof availableExportColumns[number]['key'];


const t = {
    pageTitle: "Exportă datele tale",
    pageDescription: "Selectați criteriile și formatul pentru a exporta informațiile despre parcelele dvs.",
    selectVillageLabel: "Selectează satul pentru export",
    allMyVillagesOption: "Toate satele mele operaționale",
    selectDataToExportLabel: "Selectează tipul de parcele:",
    ownedParcelsCheckbox: "Parcelele mele deținute",
    cultivatedParcelsCheckbox: "Parcelele mele cultivate",
    selectColumnsToExportLabel: "Selectează coloanele de exportat:",
    selectFormatLabel: "Selectează formatul de export:",
    excelFormat: "Excel (.xlsx)",
    pdfFormat: "PDF (.pdf)",
    wordFormat: "Word (.docx)",
    exportButton: "Generează și descarcă",
    exportingButton: "Se generează...",
    errorTitle: "Eroare",
    successTitle: "Succes",
    noDataToExport: "Nu există date de exportat conform selecției curente.",
    noVillagesMessage: "Nu aveți parcele înregistrate pentru a putea exporta date.",
    exportInitiated: "Generarea exportului a început. Descărcarea va începe automat.",
    exportFailed: "Generarea exportului a eșuat.",
    selectDataAndFormat: "Vă rugăm selectați ce date și în ce format doriți să exportați.",
    selectAtLeastOneColumn: "Selectați cel puțin o coloană pentru export."
};

type ExportFormat = 'xlsx' | 'pdf' | 'docx';
type SessionUser = { id?: string };

export default function FarmerExportPage() {
    const { data: session, status: sessionStatus } = useSession();
    const { selectedVillageFarm, operationalVillages, isFarmContextLoading } = useFarmerVillageContext();
    const { toast } = useToast();

    const [targetVillage, setTargetVillage] = useState<string | null>(null);
    const [exportOwned, setExportOwned] = useState(true);
    const [exportCultivated, setExportCultivated] = useState(true);

    const [selectedColumns, setSelectedColumns] = useState<ParcelDataExportKey[]>(
        availableExportColumns.filter(col => col.defaultSelected).map(col => col.key)
    );

    const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');

    const [isExporting, setIsExporting] = useState(false);
    const [loadingPage, setLoadingPage] = useState(true);

    const typedUser = session?.user as SessionUser | undefined;

    useEffect(() => {
        if (!isFarmContextLoading && sessionStatus === 'authenticated') {
            setTargetVillage(selectedVillageFarm);
            setLoadingPage(false);
        } else if (!isFarmContextLoading && sessionStatus !== 'loading') {
            setLoadingPage(false);
        }
    }, [selectedVillageFarm, isFarmContextLoading, sessionStatus]);

    const handleColumnSelectionChange = (columnKey: ParcelDataExportKey, checked: boolean) => {
        setSelectedColumns(prev =>
            checked ? [...prev, columnKey] : prev.filter(key => key !== columnKey)
        );
    };

    const handleExport = async () => {
        if (!typedUser?.id) { toast({ variant: "destructive", title: t.errorTitle, description: "Utilizator neautentificat." }); return; }
        if (!exportOwned && !exportCultivated) { toast({ variant: "destructive", title: t.errorTitle, description: "Selectați cel puțin un tip de parcele (deținute sau cultivate) pentru export." }); return; }
        if (selectedColumns.length === 0) { toast({ variant: "destructive", title: t.errorTitle, description: t.selectAtLeastOneColumn }); return; }

        setIsExporting(true);
        try {
            const villagesToExport = targetVillage ? [targetVillage] : operationalVillages;
            if (villagesToExport.length === 0 && operationalVillages.length === 0) { // Doar dacă lista operațională e goală și nu e "Toate" (care oricum ar fi goală)
                toast({ variant: "destructive", title: t.errorTitle, description: t.noVillagesMessage });
                setIsExporting(false); return;
            }
            // Dacă villagesToExport e gol dar operationalVillages are elemente (cazul targetVillage e invalid dar nu ALL), ar trebui prevenit, dar validarea e mai sus.

            const result = await exportFarmerDataAction({
                farmerId: typedUser.id,
                villages: villagesToExport,
                exportOwned,
                exportCultivated,
                selectedColumns,
                format: exportFormat,
            });

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
            } else {
                throw new Error(result.error || t.exportFailed);
            }
        } catch (error) {
            console.error("Export failed:", error);
            toast({ variant: "destructive", title: t.errorTitle, description: error instanceof Error ? error.message : t.exportFailed });
        } finally {
            setIsExporting(false);
        }
    };

    const pageDescription = useMemo(() => { if (isFarmContextLoading && sessionStatus === 'authenticated') return `${t.pageDescription}...`; return targetVillage ? `${t.pageDescription} pentru satul ${targetVillage}.` : `${t.pageDescription} pentru toate satele operaționale.`; }, [targetVillage, isFarmContextLoading, sessionStatus]);

    if (loadingPage) { return <div className="flex-1 p-4 sm:p-6"><Skeleton className="h-screen w-full" /></div>; }
    if (sessionStatus === 'unauthenticated') { return <div className="flex-1 p-4 sm:p-6"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Acces Nepermis</AlertTitle><AlertDescription>Trebuie să fiți autentificat.</AlertDescription></Alert></div>; }
    if (!isFarmContextLoading && operationalVillages.length === 0) { return <div className="flex-1 p-4 sm:p-6"><Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Informație</AlertTitle><AlertDescription>{t.noVillagesMessage}</AlertDescription></Alert></div>; }

    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> {t.pageTitle}</CardTitle>
                    <CardDescription>{pageDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 max-w-lg mx-auto">
                    <div>
                        <Label htmlFor="village-export-select">{t.selectVillageLabel}</Label>
                        <Select value={targetVillage === null ? 'ALL' : targetVillage || ''} onValueChange={(value) => setTargetVillage(value === 'ALL' ? null : value)} disabled={isExporting || operationalVillages.length <= 1} >
                            <SelectTrigger id="village-export-select"> <SelectValue placeholder="Selectați un sat..." /> </SelectTrigger>
                            <SelectContent> <SelectItem value="ALL">{t.allMyVillagesOption} ({operationalVillages.length})</SelectItem> {operationalVillages.map(village => (<SelectItem key={village} value={village}>{village}</SelectItem>))} </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>{t.selectDataToExportLabel}</Label>
                        <div className="flex items-center space-x-2"> <Checkbox id="exportOwned" checked={exportOwned} onCheckedChange={(checked) => setExportOwned(!!checked)} disabled={isExporting} /> <Label htmlFor="exportOwned" className="font-normal">{t.ownedParcelsCheckbox}</Label> </div>
                        <div className="flex items-center space-x-2"> <Checkbox id="exportCultivated" checked={exportCultivated} onCheckedChange={(checked) => setExportCultivated(!!checked)} disabled={isExporting} /> <Label htmlFor="exportCultivated" className="font-normal">{t.cultivatedParcelsCheckbox}</Label> </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><ListFilter className="h-4 w-4" />{t.selectColumnsToExportLabel}</Label>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                            {availableExportColumns.map(col => ( // Folosim variabila locală
                                <div key={col.key} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`col-${col.key}`}
                                        checked={selectedColumns.includes(col.key)}
                                        onCheckedChange={(checked) => handleColumnSelectionChange(col.key, !!checked)} // Asigură că checked e boolean
                                        disabled={isExporting}
                                    />
                                    <Label htmlFor={`col-${col.key}`} className="font-normal text-sm">{col.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="format-select">{t.selectFormatLabel}</Label>
                        <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)} disabled={isExporting}>
                            <SelectTrigger id="format-select"> <SelectValue placeholder="Alege formatul..." /> </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="xlsx"><FileSpreadsheet className="inline-block mr-2 h-4 w-4" />{t.excelFormat}</SelectItem>
                                <SelectItem value="pdf"><FileIconLucide className="inline-block mr-2 h-4 w-4" />{t.pdfFormat}</SelectItem>
                                <SelectItem value="docx"><FileText className="inline-block mr-2 h-4 w-4" />{t.wordFormat} </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleExport} disabled={isExporting || (!exportOwned && !exportCultivated) || selectedColumns.length === 0} className="w-full">
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isExporting ? t.exportingButton : t.exportButton}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}