// src/app/farmer/export/actions.ts
'use server';

import { getParcelsByOwner, getParcelsByCultivator, Parcel as OriginalParcel } from '@/services/parcels';
import { getFarmerById } from '@/services/farmers';
import * as ExcelJS from 'exceljs';
// Definim cheile posibile aici, dar constanta array va fi în componenta client
import type { ParcelDataExportKey } from './page'; // Vom importa tipul din page.tsx

// Interfață locală pentru a extinde Parcel cu flag-uri temporare
interface ParcelWithAssignmentFlags extends OriginalParcel {
    _isOwned?: boolean;
    _isCultivated?: boolean;
}

interface ExportParams {
    farmerId: string;
    villages: string[];
    exportOwned: boolean;
    exportCultivated: boolean;
    selectedColumns: ParcelDataExportKey[];
    format: 'xlsx' | 'pdf' | 'docx';
}

interface ExportResult {
    success: boolean;
    fileName?: string;
    contentType?: string;
    fileData?: { type: 'Buffer'; data: number[] };
    error?: string;
}

async function getFarmerParcelsForExport(farmerId: string, villages: string[], exportOwned: boolean, exportCultivated: boolean): Promise<ParcelWithAssignmentFlags[]> {
    let owned: OriginalParcel[] = [];
    let cultivated: OriginalParcel[] = [];

    if (exportOwned) {
        owned = await getParcelsByOwner(farmerId);
    }
    if (exportCultivated) {
        cultivated = await getParcelsByCultivator(farmerId);
    }

    const allParcelsMap = new Map<string, ParcelWithAssignmentFlags>();
    owned.forEach(p => allParcelsMap.set(p.id, { ...p, _isOwned: true, _isCultivated: p.cultivatorId === farmerId }));
    cultivated.forEach(p => {
        if (!allParcelsMap.has(p.id)) {
            allParcelsMap.set(p.id, { ...p, _isCultivated: true, _isOwned: p.ownerId === farmerId });
        } else {
            const existing = allParcelsMap.get(p.id)!;
            existing._isCultivated = true;
            if (!existing._isOwned && p.ownerId === farmerId) existing._isOwned = true; // Corectare pentru _isOwned
        }
    });

    let finalParcels = Array.from(allParcelsMap.values());

    if (villages.length > 0) {
        const villageSet = new Set(villages);
        finalParcels = finalParcels.filter(p => villageSet.has(p.village));
    }
    return finalParcels;
}

export async function exportFarmerDataAction(params: ExportParams): Promise<ExportResult> {
    try {
        const farmer = await getFarmerById(params.farmerId);
        if (!farmer) {
            return { success: false, error: "Agricultor negăsit." };
        }

        if (!params.selectedColumns || params.selectedColumns.length === 0) {
            return { success: false, error: "Vă rugăm selectați cel puțin o coloană pentru export." };
        }

        const parcelsToExport = await getFarmerParcelsForExport(
            params.farmerId,
            params.villages,
            params.exportOwned,
            params.exportCultivated
        );

        if (parcelsToExport.length === 0) {
            return { success: false, error: "Nu există parcele de exportat conform criteriilor selectate." };
        }

        const farmerNameSanitized = farmer.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0];
        let fileName = `parcele_${farmerNameSanitized}_${dateStr}`;
        let contentType = '';
        let buffer: Buffer;

        // Definim etichetele aici pentru a fi folosite în header, corespunzător cheilor
        const columnLabels: Record<ParcelDataExportKey, string> = {
            'id': 'ID Parcelă',
            'village': 'Sat',
            'area': 'Suprafață (ha)',
            'assignmentType': 'Tip Atribuire (față de dvs.)'
        };

        if (params.format === 'xlsx') {
            fileName += '.xlsx';
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Parcele Agricole');

            const activeHeaders = params.selectedColumns.map(key => ({
                header: columnLabels[key] || key.toUpperCase(), // Folosește eticheta sau cheia ca fallback
                key: key,
                width: key === 'id' ? 25 : (key === 'assignmentType' ? 30 : 20)
            }));

            if (activeHeaders.length === 0) {
                return { success: false, error: "Nicio coloană validă selectată pentru export." };
            }
            worksheet.columns = activeHeaders;
            worksheet.getRow(1).font = { bold: true };

            parcelsToExport.forEach(p => {
                const rowData: Partial<Record<ParcelDataExportKey, any>> = {};
                params.selectedColumns.forEach(columnKey => {
                    switch (columnKey) {
                        case 'id': rowData.id = p.id; break;
                        case 'village': rowData.village = p.village; break;
                        case 'area': rowData.area = p.area; break;
                        case 'assignmentType':
                            let type = [];
                            if (p._isOwned) type.push("Deținut");
                            if (p._isCultivated) type.push("Cultivat");
                            rowData.assignmentType = type.join(' & ') || (p.ownerId || p.cultivatorId ? 'Atribuit altcuiva' : 'Neatribuit');
                            break;
                    }
                });
                worksheet.addRow(rowData);
            });

            buffer = Buffer.from(await workbook.xlsx.writeBuffer());

        } else if (params.format === 'pdf') {
            fileName += '.pdf'; contentType = 'application/pdf';
            return { success: false, error: "Exportul PDF nu este încă implementat." };

        } else if (params.format === 'docx') {
            fileName += '.docx'; contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            return { success: false, error: "Exportul DOCX nu este încă implementat." };
        } else {
            return { success: false, error: "Format de export necunoscut." };
        }

        return {
            success: true, fileName, contentType,
            fileData: { type: 'Buffer', data: Array.from(buffer) }
        };

    } catch (error) {
        console.error("[ACTION ERROR] exportFarmerDataAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "A apărut o eroare pe server la generarea exportului." };
    }
}