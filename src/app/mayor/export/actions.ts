// src/app/mayor/export/actions.ts
'use server';

import prisma from '@/lib/prisma';
// import { Parcel } from '@/services/parcels'; // Nu mai e nevoie dacă folosim direct Prisma types
// import { Farmer } from '@/services/farmers'; // Nu mai e nevoie dacă folosim direct Prisma types
import * as ExcelJS from 'exceljs';
// Importăm tipul din page.tsx
import type { MayorExportDataKey } from './page';

// Definim etichetele aici pentru a fi folosite în header, corespunzător cheilor
// Aceasta este o duplicare intenționată, deoarece actions.ts nu poate exporta obiecte
// către client. Alternativ, etichetele pot fi trimise ca parte a params dacă devine complex.
const COLUMN_LABELS_FOR_EXPORT: Record<MayorExportDataKey, string> = {
    'parcelId': 'ID Parcelă',
    'parcelVillage': 'Sat Parcelă',
    'parcelArea': 'Suprafață Parcelă (ha)',
    'ownerName': 'Nume Proprietar/Arendator',
    'ownerCode': 'Cod Fiscal Proprietar/Arendator',
    'cultivatorName': 'Nume Cultivator',
    'cultivatorCode': 'Cod Fiscal Cultivator',
};


interface ExportParams {
    mayorId: string;
    filterVillages: string[];
    filterFarmerIds: string[];
    selectedColumns: MayorExportDataKey[];
    format: 'xlsx' | 'pdf' | 'docx';
}

interface ExportResult {
    success: boolean;
    fileName?: string;
    contentType?: string;
    fileData?: { type: 'Buffer'; data: number[] };
    error?: string;
}

interface EnrichedParcelDataForMayor {
    parcelId: string;
    parcelVillage: string;
    parcelArea: number;
    ownerName?: string | null;
    ownerCode?: string | null;
    cultivatorName?: string | null;
    cultivatorCode?: string | null;
}

export async function exportMayorDataAction(params: ExportParams): Promise<ExportResult> {
    try {
        const mayor = await prisma.mayor.findUnique({
            where: { id: params.mayorId },
            include: { managedVillages: { select: { name: true } } }
        });

        if (!mayor) return { success: false, error: "Primar neidentificat." };

        const mayorManagedVillageNames = mayor.managedVillages.map(v => v.name);
        const villagesForQuery = params.filterVillages.filter(v => mayorManagedVillageNames.includes(v));

        if (villagesForQuery.length === 0) {
            return { success: false, error: "Niciun sat valid selectat din jurisdicția primarului." };
        }
        if (!params.selectedColumns || params.selectedColumns.length === 0) { // Verificare adăugată
            return { success: false, error: "Selectați cel puțin o coloană pentru export." };
        }

        const parcels = await prisma.parcel.findMany({
            where: {
                village: { in: villagesForQuery },
                ...(params.filterFarmerIds && params.filterFarmerIds.length > 0 && { // Verifică dacă filterFarmerIds e definit și are elemente
                    OR: [
                        { ownerId: { in: params.filterFarmerIds } },
                        { cultivatorId: { in: params.filterFarmerIds } }
                    ]
                })
            },
            include: {
                owner: { select: { name: true, companyCode: true } },
                cultivator: { select: { name: true, companyCode: true } }
            },
            orderBy: [{ village: 'asc' }, { id: 'asc' }]
        });

        if (parcels.length === 0) {
            return { success: false, error: "Nu există parcele de exportat conform criteriilor." };
        }

        const dataForExport: EnrichedParcelDataForMayor[] = parcels.map(p => ({
            parcelId: p.id,
            parcelVillage: p.village,
            parcelArea: p.area,
            ownerName: p.owner?.name,
            ownerCode: p.owner?.companyCode,
            cultivatorName: p.cultivator?.name,
            cultivatorCode: p.cultivator?.companyCode,
        }));

        const dateStr = new Date().toISOString().split('T')[0];
        let fileName = `raport_parcele_primarie_${mayor.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dateStr}`;
        let contentType = '';
        let buffer: Buffer;

        if (params.format === 'xlsx') {
            fileName += '.xlsx';
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Date Parcele');

            const activeHeaders = params.selectedColumns.map(key => ({
                header: COLUMN_LABELS_FOR_EXPORT[key] || key.toUpperCase(),
                key: key,
                width: key.toLowerCase().includes('code') ? 20 : (key.toLowerCase().includes('name') ? 30 : (key === 'parcelId' ? 25 : 15))
            }));

            if (activeHeaders.length === 0) {
                return { success: false, error: "Nicio coloană validă selectată pentru export." };
            }
            worksheet.columns = activeHeaders;
            worksheet.getRow(1).font = { bold: true };

            dataForExport.forEach(item => {
                const rowData: any = {};
                params.selectedColumns.forEach(columnKey => {
                    rowData[columnKey] = item[columnKey as keyof EnrichedParcelDataForMayor] ?? '-';
                });
                worksheet.addRow(rowData);
            });

            buffer = Buffer.from(await workbook.xlsx.writeBuffer());

        } else if (params.format === 'pdf') {
            fileName += '.pdf'; contentType = 'application/pdf';
            return { success: false, error: "Exportul PDF nu este încă implementat pentru primari." };
        } else if (params.format === 'docx') {
            fileName += '.docx'; contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            return { success: false, error: "Exportul DOCX nu este încă implementat pentru primari." };
        } else {
            return { success: false, error: "Format de export necunoscut." };
        }

        return {
            success: true, fileName, contentType,
            fileData: { type: 'Buffer', data: Array.from(buffer) }
        };

    } catch (error) {
        console.error("[MAYOR EXPORT ACTION ERROR]:", error);
        return { success: false, error: error instanceof Error ? error.message : "Eroare pe server la generarea exportului." };
    }
}