// src/services/parcels.ts
'use server';

import prisma from '@/lib/prisma';
import type { Parcel as PrismaParcel, Farmer as PrismaFarmer, LogType as PrismaLogType, Mayor as PrismaMayor } from '@prisma/client'; // Am eliminat Village de aici că nu era folosit direct
import { addLogEntry } from './logs';
// Am eliminat importul WGS84Coordinates din types.ts dacă nu e definit acolo sau e simplu [number,number][]
// Presupunem că WGS84Coordinates este definit ca Array<[number, number]> direct unde e folosit.
// type WGS84Coordinates = Array<[number, number]>; // Definiție locală dacă e necesar

export type Parcel = Omit<PrismaParcel, 'coordinates' | 'id'> & {
    id: string; // Asigurăm că ID-ul este string, deși Prisma îl poate avea ca string deja
    coordinates: Array<[number, number]>; // Specificăm tipul direct
};

interface ParcelUploadData {
    id: string;
    village: string;
    area: number;
    coordinates: Array<[number, number]>;
}

function mapPrismaParcel(prismaParcel: PrismaParcel): Parcel {
    let coordinates: Array<[number, number]> = [];

    if (prismaParcel.coordinates && typeof prismaParcel.coordinates === 'object' && Array.isArray(prismaParcel.coordinates)) {
        const isValidWGS84 = (prismaParcel.coordinates as unknown[]).every(
            (coordPair): coordPair is [number, number] =>
                Array.isArray(coordPair) &&
                coordPair.length === 2 &&
                typeof coordPair[0] === 'number' &&
                typeof coordPair[1] === 'number'
        );

        if (isValidWGS84) {
            coordinates = prismaParcel.coordinates as Array<[number, number]>;
        } else {
            console.warn(`[ParcelService] mapPrismaParcel: Parcel ID ${prismaParcel.id} has malformed 'coordinates' in database. Expected Array<[number, number]>. Found:`, JSON.stringify(prismaParcel.coordinates));
        }
    } else if (prismaParcel.coordinates) {
        console.warn(`[ParcelService] mapPrismaParcel: Parcel ID ${prismaParcel.id} 'coordinates' is not an array. Found:`, typeof prismaParcel.coordinates);
    }

    return {
        ...prismaParcel,
        id: String(prismaParcel.id), // Asigură că id-ul e string
        coordinates: coordinates,
    };
}

export async function getAllParcels(): Promise<Parcel[]> {
    console.log('[ParcelService] Fetching all parcels from DB');
    try {
        const prismaParcels = await prisma.parcel.findMany({
            orderBy: { id: 'asc' } // Sau alt criteriu de sortare dorit
        });
        return prismaParcels.map(mapPrismaParcel);
    } catch (error) {
        console.error('[ParcelService] Error fetching all parcels:', error);
        throw new Error('Nu s-au putut încărca toate parcelele.');
    }
}

export async function getParcelsByVillages(villages: string[]): Promise<Parcel[]> {
    if (!villages || villages.length === 0) {
        return [];
    }
    console.log(`[ParcelService] Fetching parcels for villages: ${villages.join(', ')}`);
    try {
        const prismaParcels = await prisma.parcel.findMany({
            where: { village: { in: villages } },
            orderBy: [ // Corecție pentru sortare multiplă
                { village: 'asc' },
                { id: 'asc' }
            ]
        });
        return prismaParcels.map(mapPrismaParcel);
    } catch (error) {
        console.error(`[ParcelService] Error fetching parcels for villages ${villages.join(', ')}:`, error);
        throw new Error(`Nu s-au putut încărca parcelele pentru satele specificate.`);
    }
}


export async function getParcelsByVillage(village: string): Promise<Parcel[]> {
    console.log(`[ParcelService] Fetching parcels for village: ${village}`);
    try {
        const prismaParcels = await prisma.parcel.findMany({
            where: { village },
            orderBy: { id: 'asc' }
        });
        return prismaParcels.map(mapPrismaParcel);
    } catch (error) {
        console.error(`[ParcelService] Error fetching parcels for village ${village}:`, error);
        throw new Error(`Nu s-au putut încărca parcelele pentru satul ${village}.`);
    }
}

export async function getParcelsByOwner(ownerId: string): Promise<Parcel[]> {
    console.log(`[ParcelService] Fetching parcels owned by farmer ID: ${ownerId}`);
    try {
        const prismaParcels = await prisma.parcel.findMany({
            where: { ownerId },
            // CORECȚIE AICI: orderBy trebuie să fie un array de obiecte
            orderBy: [
                { village: 'asc' },
                { id: 'asc' }
            ]
        });
        return prismaParcels.map(mapPrismaParcel);
    } catch (error) {
        console.error(`[ParcelService] Error fetching parcels for owner ${ownerId}:`, error);
        throw new Error(`Nu s-au putut încărca parcelele pentru proprietarul ${ownerId}.`);
    }
}

export async function getParcelsByCultivator(cultivatorId: string): Promise<Parcel[]> {
    console.log(`[ParcelService] Fetching parcels cultivated by farmer ID: ${cultivatorId}`);
    try {
        const prismaParcels = await prisma.parcel.findMany({
            where: { cultivatorId },
            // CORECȚIE AICI: orderBy trebuie să fie un array de obiecte
            orderBy: [
                { village: 'asc' },
                { id: 'asc' }
            ]
        });
        return prismaParcels.map(mapPrismaParcel);
    } catch (error) {
        console.error(`[ParcelService] Error fetching parcels for cultivator ${cultivatorId}:`, error);
        throw new Error(`Nu s-au putut încărca parcelele pentru cultivatorul ${cultivatorId}.`);
    }
}

export async function getParcelById(parcelId: string): Promise<Parcel | null> {
    console.log(`[ParcelService] Fetching parcel by ID: ${parcelId}`);
    try {
        const prismaParcel = await prisma.parcel.findUnique({
            where: { id: parcelId },
        });
        return prismaParcel ? mapPrismaParcel(prismaParcel) : null;
    } catch (error) {
        console.error(`[ParcelService] Error fetching parcel by ID ${parcelId}:`, error);
        throw new Error(`Nu s-a putut încărca parcela ${parcelId}.`);
    }
}

export async function addUpdateParcelBatch(
    parcelsToProcess: ParcelUploadData[]
): Promise<{ success: boolean; message?: string; error?: string; processedCount?: number, errors?: { id: string | null, error: string }[] }> {
    console.log(`[ParcelService] Starting batch update/create for ${parcelsToProcess.length} parcels.`);
    let processedCount = 0;
    const individualErrors: { id: string | null, error: string }[] = [];

    if (!parcelsToProcess || parcelsToProcess.length === 0) {
        return { success: true, message: "Nicio parcelă furnizată pentru procesare în lot.", processedCount: 0 };
    }

    try {
        for (const parcelData of parcelsToProcess) {
            const currentParcelLogId = parcelData.id || `INVALID_ID_ROW_${processedCount + individualErrors.length + 1}`;
            try {
                if (!parcelData.id || typeof parcelData.id !== 'string' || parcelData.id.trim() === '') {
                    individualErrors.push({ id: parcelData.id || null, error: "ID parcelă invalid sau gol." });
                    continue;
                }
                if (!parcelData.village || typeof parcelData.village !== 'string' || parcelData.village.trim() === '') {
                    individualErrors.push({ id: parcelData.id, error: "Sat parcelă invalid sau gol." });
                    continue;
                }
                if (typeof parcelData.area !== 'number' || parcelData.area <= 0) {
                    individualErrors.push({ id: parcelData.id, error: "Suprafață parcelă invalidă sau nu este un număr pozitiv." });
                    continue;
                }
                if (!Array.isArray(parcelData.coordinates) || parcelData.coordinates.length < 3) { // Un poligon valid are cel puțin 3 puncte distincte (+1 pentru închidere)
                    individualErrors.push({ id: parcelData.id, error: "Coordonate parcelă invalide (trebuie să fie un array cu cel puțin 3 perechi [lon, lat])." });
                    continue;
                }
                // Validare suplimentară pentru fiecare pereche de coordonate
                const allCoordsValid = parcelData.coordinates.every(
                    (coord: any) => Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number'
                );
                if (!allCoordsValid) {
                    individualErrors.push({ id: parcelData.id, error: "Cel puțin o pereche de coordonate este invalidă." });
                    continue;
                }


                const prismaCoordinatesPayload = parcelData.coordinates as any; // Prisma se așteaptă la JsonValue

                await prisma.parcel.upsert({
                    where: { id: parcelData.id.trim() }, // Asigură trim pe ID
                    update: {
                        village: parcelData.village.trim(),
                        area: parcelData.area,
                        coordinates: prismaCoordinatesPayload,
                    },
                    create: {
                        id: parcelData.id.trim(),
                        village: parcelData.village.trim(),
                        area: parcelData.area,
                        coordinates: prismaCoordinatesPayload,
                    },
                });
                processedCount++;
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : 'Eroare necunoscută la upsert parcelă';
                console.error(`[ParcelService] Error processing parcel ID ${currentParcelLogId}:`, errorMsg, e);
                individualErrors.push({ id: currentParcelLogId, error: errorMsg });
            }
        }

        const totalAttempted = parcelsToProcess.length;
        const logType = 'PARCEL_UPLOAD' as PrismaLogType; // Cast explicit

        if (individualErrors.length > 0) {
            const summaryError = `Procesate ${processedCount} din ${totalAttempted} parcele. Eșec la procesarea a ${individualErrors.length} parcele.`;
            console.warn('[ParcelService] Batch processing completed with errors:', summaryError);
            await addLogEntry(logType, 'Admin_Batch_Process', 'Procesare Lot Cu Erori', `${summaryError} Prima eroare: ${individualErrors[0].id || 'ID_Lipsa'} - ${individualErrors[0].error}`);
            return {
                success: processedCount > 0, // Considerăm succes parțial dacă măcar o parcelă a fost procesată
                message: summaryError,
                processedCount,
                errors: individualErrors,
                error: `Una sau mai multe parcele nu au putut fi procesate. ${processedCount} succes.`
            };
        }

        console.log(`[ParcelService] Batch update/create completed successfully for ${processedCount} of ${totalAttempted} parcels.`);
        await addLogEntry(logType, 'Admin_Batch_Process', 'Procesare Lot Succes', `Procesate cu succes ${processedCount} parcele.`);
        return { success: true, message: `Procesate cu succes ${processedCount} parcele.`, processedCount };

    } catch (batchError) {
        const errorMsg = batchError instanceof Error ? batchError.message : 'Eroare critică necunoscută la procesarea în lot';
        console.error('[ParcelService] Critical error during batch parcel processing:', errorMsg, batchError);
        await addLogEntry('PARCEL_UPLOAD' as PrismaLogType, 'Admin_Batch_Process', 'Eroare Critică Procesare Lot', `Error: ${errorMsg}`);
        return { success: false, error: `Procesarea în lot a eșuat critic: ${errorMsg}`, processedCount };
    }
}

export interface ParcelAssignmentConflict {
    parcelId: string;
    village: string;
    currentOwnerId?: string | null;
    currentOwnerName?: string | null;
    currentCultivatorId?: string | null;
    currentCultivatorName?: string | null;
    attemptedAssignmentType: 'owner' | 'cultivator';
    attemptingToAssignToFarmerId: string;
    attemptingToAssignToFarmerName: string;
}

export interface AssignmentResult {
    success: boolean;
    message?: string;
    error?: string;
    conflicts?: ParcelAssignmentConflict[];
}

export async function assignParcelsToFarmer(
    targetFarmerId: string,
    desiredOwnedParcelIds: string[],
    desiredCultivatedParcelIds: string[],
    actorMayorId: string,
    forceAssignments: boolean = false
): Promise<AssignmentResult> {
    console.log(`[ParcelService] Assigning to farmer ${targetFarmerId}. Desired Owned: [${desiredOwnedParcelIds.join(',') || 'None'}] Desired Cultivated: [${desiredCultivatedParcelIds.join(',') || 'None'}] By Mayor ID: ${actorMayorId}. Force: ${forceAssignments}`);
    const logTypeAssignment = 'ASSIGNMENT' as PrismaLogType;

    try {
        const targetFarmer = await prisma.farmer.findUnique({ where: { id: targetFarmerId } });
        if (!targetFarmer) {
            await addLogEntry(logTypeAssignment, actorMayorId, 'Atribuire Eșuată', `Eroare: Fermier țintă ID ${targetFarmerId} negăsit.`);
            return { success: false, error: `Fermierul țintă cu ID ${targetFarmerId} nu a fost găsit.` };
        }

        const actorMayor = await prisma.mayor.findUnique({
            where: { id: actorMayorId },
            include: { managedVillages: { select: { name: true } } }
        });
        if (!actorMayor || !actorMayor.managedVillages || actorMayor.managedVillages.length === 0) {
            await addLogEntry(logTypeAssignment, actorMayorId, 'Atribuire Eșuată', `Eroare: Primar ID ${actorMayorId} negăsit sau nu gestionează niciun sat.`);
            return { success: false, error: `Primarul ${actorMayorId} nu a fost găsit sau nu are sate asignate.` };
        }
        const mayorManagedVillages = actorMayor.managedVillages.map(v => v.name);

        const allPotentiallyAffectedIds = new Set<string>();
        desiredOwnedParcelIds.forEach(id => allPotentiallyAffectedIds.add(id));
        desiredCultivatedParcelIds.forEach(id => allPotentiallyAffectedIds.add(id));

        const currentlyAssignedToTargetFarmerInMayorVillages = await prisma.parcel.findMany({
            where: {
                village: { in: mayorManagedVillages },
                OR: [{ ownerId: targetFarmerId }, { cultivatorId: targetFarmerId }]
            },
            select: { id: true }
        });
        currentlyAssignedToTargetFarmerInMayorVillages.forEach(p => allPotentiallyAffectedIds.add(p.id));

        const uniqueParcelIdsToCheck = Array.from(allPotentiallyAffectedIds);

        if (uniqueParcelIdsToCheck.length === 0 && desiredOwnedParcelIds.length === 0 && desiredCultivatedParcelIds.length === 0) {
            return { success: true, message: `Nicio modificare necesară pentru ${targetFarmer.name} în satele gestionate.` };
        }

        const parcelsInDB = await prisma.parcel.findMany({
            where: {
                id: { in: uniqueParcelIdsToCheck.length > 0 ? uniqueParcelIdsToCheck : undefined }, // Evită `in: []` care dă eroare
                village: { in: mayorManagedVillages }
            },
            include: {
                owner: { select: { id: true, name: true } },
                cultivator: { select: { id: true, name: true } }
            }
        });

        const foundParcelIdsInDB = new Set(parcelsInDB.map(p => p.id));
        const allDesiredIds = new Set([...desiredOwnedParcelIds, ...desiredCultivatedParcelIds]);
        const invalidDesiredIds = Array.from(allDesiredIds).filter(id => !foundParcelIdsInDB.has(id));

        if (invalidDesiredIds.length > 0) {
            const errorMsg = `Următoarele ID-uri de parcele dorite sunt invalide sau nu aparțin satelor gestionate de dvs. (${mayorManagedVillages.join(', ')}): ${[...new Set(invalidDesiredIds)].join(', ')}`;
            await addLogEntry(logTypeAssignment, actorMayorId, 'Atribuire Eșuată', `Parcele invalide pentru ${targetFarmer.name}: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }

        const conflicts: ParcelAssignmentConflict[] = [];
        if (!forceAssignments) {
            for (const parcelId of desiredOwnedParcelIds) {
                const parcel = parcelsInDB.find(p => p.id === parcelId);
                if (parcel?.ownerId && parcel.ownerId !== targetFarmerId) {
                    conflicts.push({ parcelId: parcel.id, village: parcel.village, currentOwnerId: parcel.ownerId, currentOwnerName: parcel.owner?.name || 'Necunoscut', attemptedAssignmentType: 'owner', attemptingToAssignToFarmerId: targetFarmerId, attemptingToAssignToFarmerName: targetFarmer.name });
                }
            }
            for (const parcelId of desiredCultivatedParcelIds) {
                const parcel = parcelsInDB.find(p => p.id === parcelId);
                if (parcel?.cultivatorId && parcel.cultivatorId !== targetFarmerId) {
                    // Verificăm dacă nu cumva cultivatorul actual este proprietarul care VA FI înlocuit
                    const newOwnerWillBeTarget = desiredOwnedParcelIds.includes(parcelId);
                    if (parcel.cultivatorId !== parcel.ownerId || !newOwnerWillBeTarget || (newOwnerWillBeTarget && parcel.ownerId !== targetFarmerId)) {
                        conflicts.push({ parcelId: parcel.id, village: parcel.village, currentCultivatorId: parcel.cultivatorId, currentCultivatorName: parcel.cultivator?.name || 'Necunoscut', attemptedAssignmentType: 'cultivator', attemptingToAssignToFarmerId: targetFarmerId, attemptingToAssignToFarmerName: targetFarmer.name });
                    }
                }
            }
        }

        if (conflicts.length > 0 && !forceAssignments) {
            console.log(`[ParcelService] Assignment conflicts for ${targetFarmerId} by mayor ${actorMayorId}:`, conflicts.length);
            return { success: false, conflicts: conflicts, message: `Au fost detectate ${conflicts.length} conflicte de atribuire.` };
        }

        await prisma.$transaction(async (tx) => {
            const ownedSet = new Set(desiredOwnedParcelIds);
            const cultivatedSet = new Set(desiredCultivatedParcelIds);

            for (const parcel of parcelsInDB) { // Iterăm doar prin parcelele relevante (din satele primarului)
                // Dezasociere Proprietar/Arendator
                if (parcel.ownerId === targetFarmerId && !ownedSet.has(parcel.id)) {
                    await tx.parcel.update({ where: { id: parcel.id }, data: { ownerId: null } });
                }
                // Dezasociere cultivator
                if (parcel.cultivatorId === targetFarmerId && !cultivatedSet.has(parcel.id)) {
                    await tx.parcel.update({ where: { id: parcel.id }, data: { cultivatorId: null } });
                }
            }
            // Atribuire proprietate
            for (const parcelId of desiredOwnedParcelIds) {
                const parcel = parcelsInDB.find(p => p.id === parcelId); // Parcela trebuie să existe în satele primarului
                if (parcel && (parcel.ownerId !== targetFarmerId || forceAssignments)) {
                    await tx.parcel.update({ where: { id: parcelId }, data: { ownerId: targetFarmerId } });
                }
            }
            // Atribuire cultivare
            for (const parcelId of desiredCultivatedParcelIds) {
                const parcel = parcelsInDB.find(p => p.id === parcelId);
                if (parcel && (parcel.cultivatorId !== targetFarmerId || forceAssignments)) {
                    await tx.parcel.update({ where: { id: parcelId }, data: { cultivatorId: targetFarmerId } });
                }
            }
        });

        await addLogEntry(logTypeAssignment, actorMayorId, 'Parcele Atribuite', `Fmr: ${targetFarmer.name} (${targetFarmerId}). Sate: ${mayorManagedVillages.join(',')}. Proprii: [${desiredOwnedParcelIds.join(',') || 'N'}] Cultivate: [${desiredCultivatedParcelIds.join(',') || 'N'}] Forțat:${forceAssignments}`);
        return { success: true, message: `Parcelele pentru ${targetFarmer.name} au fost actualizate în satele gestionate.` };

    } catch (error) {
        console.error('[ParcelService] Error during parcel assignment:', error);
        const errorMsg = error instanceof Error ? error.message : 'Eroare necunoscută la atribuire.';
        await addLogEntry(logTypeAssignment, actorMayorId, 'Atribuire Eșuată Critic', `FmrID: ${targetFarmerId}. Err: ${errorMsg}`);
        return { success: false, error: `Eroare la atribuire: ${errorMsg}` };
    }
}