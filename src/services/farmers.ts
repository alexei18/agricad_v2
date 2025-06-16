// src/services/farmers.ts
'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { Farmer as PrismaFarmer, LogType as PrismaLogType } from '@prisma/client';
import { addLogEntry } from './logs';
import bcrypt from 'bcrypt';

// Constante
const DEFAULT_COLORS = [
    'hsl(217, 91%, 60%)', // Blue
    'hsl(122, 39%, 49%)', // Green
    'hsl(40, 90%, 60%)',  // Yellowish
    'hsl(0, 70%, 65%)',   // Reddish
    'hsl(260, 60%, 60%)', // Purplish
    'hsl(180, 50%, 50%)', // Teal
    'hsl(30, 90%, 55%)',  // Orange
    'hsl(320, 70%, 60%)', // Pink
];
const SALT_ROUNDS = 10;

// Tipuri de date exportate
export type Farmer = PrismaFarmer;
// Tip pentru adăugare: parola este obligatorie
export type AddFarmerData = Omit<Farmer, 'id' | 'createdAt' | 'updatedAt' | 'color' | 'mustChangePassword'> & {
    password: string;
    color?: string | null;
};
// Tip pentru actualizare: parțial și fără câmpurile sensibile
export type UpdateFarmerData = Partial<Omit<Farmer, 'id' | 'createdAt' | 'updatedAt' | 'password'>>;


// --- Funcții Utilitare Interne ---

/**
 * Generează următoarea culoare implicită pentru un fermier nou, bazat pe numărul de fermieri existenți.
 * @param village - Satul pentru care se calculează (opțional).
 * @returns O string reprezentând culoarea HSL.
 */
async function getNextDefaultColor(village?: string): Promise<string> {
    try {
        const farmerCount = await prisma.farmer.count({
            where: village ? { village: village } : {},
        });
        return DEFAULT_COLORS[farmerCount % DEFAULT_COLORS.length];
    } catch (error) {
        console.error('[FarmerService] Error counting farmers for default color:', error);
        return DEFAULT_COLORS[0]; // Culoare de rezervă
    }
}


// --- Funcții de Preluare a Datelor (Getters) ---

/**
 * Preia toți fermierii, opțional filtrați după un singur sat.
 * @param villageFilter - Numele satului pentru filtrare (opțional).
 * @returns O listă de fermieri fără parolă.
 */
export async function getAllFarmers(villageFilter?: string): Promise<Omit<Farmer, 'password'>[]> {
    console.log(`[FarmerService] Fetching farmers ${villageFilter ? `for village: ${villageFilter}` : 'for all villages'}`);
    try {
        return await prisma.farmer.findMany({
            where: villageFilter ? { village: villageFilter } : {},
            orderBy: { name: 'asc' },
            select: {
                id: true, name: true, companyCode: true, village: true,
                email: true, phone: true, color: true, createdAt: true, updatedAt: true,
                mustChangePassword: true, // MODIFICARE: Câmp adăugat
            },
        });
    } catch (error) {
        console.error('[FarmerService] Error fetching farmers:', error);
        throw new Error('Nu s-au putut încărca datele agricultorilor.');
    }
}

/**
 * Preia fermierii asociați cu o listă de sate.
 * Un fermier este considerat asociat dacă este înregistrat în sat sau are parcele acolo.
 * @param villages - O listă de nume de sate.
 * @returns O listă de fermieri unici fără parolă.
 */
export async function getFarmersByVillages(villages: string[]): Promise<Omit<Farmer, 'password'>[]> {
    if (!villages || villages.length === 0) {
        return [];
    }
    console.log(`[FarmerService] Fetching farmers for villages: ${villages.join(', ')}`);
    try {
        return await prisma.farmer.findMany({
            where: {
                OR: [
                    { ownedParcels: { some: { village: { in: villages } } } },
                    { cultivatedParcels: { some: { village: { in: villages } } } },
                    { village: { in: villages } }
                ]
            },
            orderBy: { name: 'asc' },
            select: {
                id: true, name: true, companyCode: true, village: true,
                email: true, phone: true, color: true, createdAt: true, updatedAt: true,
                mustChangePassword: true, // MODIFICARE: Câmp adăugat
            }
        });
    } catch (error) {
        console.error('[FarmerService] Error fetching farmers by villages:', error);
        throw new Error('Nu s-au putut încărca datele agricultorilor pentru satele specificate.');
    }
}

/**
 * Preia un singur fermier după ID.
 * @param id - ID-ul fermierului.
 * @returns Obiectul fermier fără parolă sau null dacă nu este găsit.
 */
export async function getFarmerById(id: string): Promise<Omit<Farmer, 'password'> | null> {
    console.log(`[FarmerService] Fetching farmer by ID: ${id}`);
    try {
        return await prisma.farmer.findUnique({
            where: { id: id },
            select: {
                id: true, name: true, companyCode: true, village: true,
                email: true, phone: true, color: true, createdAt: true, updatedAt: true,
                mustChangePassword: true, // MODIFICARE: Câmp adăugat
            },
        });
    } catch (error) {
        console.error(`[FarmerService] Error fetching farmer ${id}:`, error);
        throw new Error('Nu s-au putut încărca datele agricultorului.');
    }
}

/**
 * Preia un singur fermier după codul fiscal (companyCode).
 * @param companyCode - Codul fiscal al fermierului.
 * @returns Obiectul fermier fără parolă sau null dacă nu este găsit.
 */
export async function getFarmerByCompanyCode(companyCode: string): Promise<Omit<Farmer, 'password'> | null> {
    if (!companyCode) return null;
    console.log(`[FarmerService] Fetching farmer by company code: ${companyCode}`);
    try {
        return await prisma.farmer.findUnique({
            where: { companyCode: companyCode.trim() },
            select: {
                id: true, name: true, companyCode: true, village: true,
                email: true, phone: true, color: true, createdAt: true, updatedAt: true,
                mustChangePassword: true, // MODIFICARE: Câmp adăugat
            },
        });
    } catch (error) {
        console.error(`[FarmerService] Error fetching farmer by code ${companyCode}:`, error);
        return null; // Returnează null în caz de eroare, nu arunca excepția
    }
}


// --- Funcții de Modificare a Datelor (CUD - Create, Update, Delete) ---

/**
 * Adaugă un fermier nou în baza de date.
 * @param farmerData - Datele noului fermier.
 * @param actorId - ID-ul utilizatorului care realizează acțiunea.
 * @returns Un obiect cu statusul operațiunii și, opțional, ID-ul noului fermier sau un cod de eroare.
 */
export async function addFarmer(
    farmerData: AddFarmerData,
    actorId: string
): Promise<{ success: boolean; id?: string; error?: string; errorCode?: 'FARMER_EXISTS' | 'EMAIL_EXISTS' }> {
    // Validări inițiale
    if (!farmerData.name || !farmerData.companyCode || !farmerData.village || !farmerData.password) {
        return { success: false, error: "Lipsesc câmpurile obligatorii (nume, cod fiscal, sat, parolă)." };
    }
    if (farmerData.password.length < 8) {
        return { success: false, error: "Parola trebuie să aibă cel puțin 8 caractere." };
    }
    if (farmerData.email && !/\S+@\S+\.\S+/.test(farmerData.email)) {
        return { success: false, error: "Format email invalid." };
    }

    try {
        // Verifică dacă există deja un fermier cu același cod fiscal
        const existingByCode = await prisma.farmer.findUnique({
            where: { companyCode: farmerData.companyCode },
        });

        if (existingByCode) {
            await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Attempt Add Existing Farmer', `Code ${farmerData.companyCode} exists (ID: ${existingByCode.id}).`);
            return {
                success: false,
                error: `Un agricultor cu codul fiscal ${farmerData.companyCode} există deja.`,
                errorCode: 'FARMER_EXISTS',
                id: existingByCode.id // Trimite ID-ul existent înapoi
            };
        }

        // Verifică dacă email-ul este deja utilizat
        if (farmerData.email) {
            const existingByEmail = await prisma.farmer.findUnique({ where: { email: farmerData.email } });
            if (existingByEmail) {
                return { success: false, error: `Email-ul ${farmerData.email} este deja utilizat.`, errorCode: 'EMAIL_EXISTS' };
            }
        }

        const hashedPassword = await bcrypt.hash(farmerData.password, SALT_ROUNDS);
        const farmerColor = farmerData.color || await getNextDefaultColor(farmerData.village);

        const newFarmer = await prisma.farmer.create({
            data: {
                ...farmerData,
                email: farmerData.email || null,
                phone: farmerData.phone || null,
                password: hashedPassword,
                color: farmerColor,
                mustChangePassword: true, // MODIFICARE: Forțează schimbarea parolei la primul login
            },
        });

        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Added Farmer', `ID: ${newFarmer.id}, Name: ${newFarmer.name}`);
        return { success: true, id: newFarmer.id };

    } catch (error: any) {
        console.error('[FarmerService] Error adding farmer:', error);
        let errorMessage = 'Nu s-a putut adăuga agricultorul.';
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // MODIFICARE: Gestionare de erori mai robustă
            if (error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('companyCode')) {
                errorMessage = `Un agricultor cu codul fiscal ${farmerData.companyCode} există deja.`;
            } else if (error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('email')) {
                errorMessage = `Un agricultor cu email-ul ${farmerData.email} există deja.`;
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Add Farmer', `Database Error: ${errorMessage}`);
        return { success: false, error: `Eroare bază de date: ${errorMessage}` };
    }
}

/**
 * Actualizează datele unui fermier existent.
 * @param id - ID-ul fermierului de actualizat.
 * @param farmerData - Datele de actualizat.
 * @param actorId - ID-ul utilizatorului care realizează acțiunea.
 * @returns Un obiect cu statusul operațiunii.
 */
export async function updateFarmer(
    id: string,
    farmerData: UpdateFarmerData,
    actorId: string
): Promise<{ success: boolean; error?: string }> {
    console.log(`[FarmerService] Updating farmer ${id} by ${actorId}:`, farmerData);

    try {
        const farmer = await prisma.farmer.findUnique({ where: { id } });
        if (!farmer) {
            await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Update Farmer', `Error: Farmer ID ${id} not found.`);
            return { success: false, error: `Agricultorul cu ID ${id} nu a fost găsit.` };
        }

        // Validări de unicitate pentru email și cod fiscal dacă se schimbă
        if (farmerData.email && farmerData.email !== farmer.email) {
            const existingByEmail = await prisma.farmer.findFirst({ where: { email: farmerData.email, id: { not: id } } });
            if (existingByEmail) {
                return { success: false, error: `Email-ul ${farmerData.email} este deja utilizat.` };
            }
        }
        if (farmerData.companyCode && farmerData.companyCode !== farmer.companyCode) {
            const existingByCode = await prisma.farmer.findFirst({ where: { companyCode: farmerData.companyCode, id: { not: id } } });
            if (existingByCode) {
                return { success: false, error: `Codul fiscal ${farmerData.companyCode} este deja utilizat.` };
            }
        }

        // Curățare date
        delete (farmerData as any).password;
        if (farmerData.email === '') farmerData.email = null;
        if (farmerData.phone === '') farmerData.phone = null;
        if (farmerData.color === '') farmerData.color = await getNextDefaultColor(farmer.village);

        const updatedFarmer = await prisma.farmer.update({
            where: { id: id },
            data: farmerData,
        });

        // Log detaliat al modificărilor
        const changes = Object.keys(farmerData)
            .filter(key => key !== 'createdAt' && key !== 'updatedAt' && key !== 'password')
            .map(key => `${key}: '${(farmer as any)[key]}' -> '${(updatedFarmer as any)[key]}'`)
            .join(', ');
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Updated Farmer', `ID: ${id}, Changes: ${changes || 'None'}`);

        return { success: true };

    } catch (error: any) {
        console.error(`[FarmerService] Error updating farmer ${id}:`, error);
        let errorMessage = 'Nu s-a putut actualiza agricultorul.';
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            if (error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('companyCode')) {
                errorMessage = `Un agricultor cu codul fiscal ${farmerData.companyCode} există deja.`;
            } else if (error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('email')) {
                errorMessage = `Un agricultor cu email-ul ${farmerData.email} există deja.`;
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Update Farmer', `ID: ${id}, Error: ${errorMessage}`);
        return { success: false, error: `Eroare bază de date: ${errorMessage}` };
    }
}

/**
 * Șterge un fermier din baza de date.
 * @param id - ID-ul fermierului de șters.
 * @param actorId - ID-ul utilizatorului care realizează acțiunea.
 * @returns Un obiect cu statusul operațiunii.
 */
export async function deleteFarmer(
    id: string,
    actorId: string
): Promise<{ success: boolean; error?: string }> {
    console.log(`[FarmerService] Deleting farmer ${id} by ${actorId}`);
    try {
        const farmer = await prisma.farmer.findUnique({ where: { id } });
        if (!farmer) {
            await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Delete Farmer', `Error: Farmer ID ${id} not found.`);
            return { success: false, error: `Agricultorul cu ID ${id} nu a fost găsit.` };
        }

        await prisma.farmer.delete({ where: { id: id } });

        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Deleted Farmer', `ID: ${id}, Name: ${farmer.name}, Village: ${farmer.village}`);
        return { success: true };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Could not delete farmer.';
        console.error(`[FarmerService] Error deleting farmer ${id}:`, error);
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Delete Farmer', `ID: ${id}, Error: ${errorMessage}`);
        return { success: false, error: `Eroare bază de date: ${errorMessage}` };
    }
}


// --- Funcții Specifice pentru Gestionarea Parolei ---

type ChangeFarmerPasswordData = {
    newPassword: string;
    oldPassword?: string;
};

/**
 * Permite unui fermier să-și schimbe propria parolă sau unui admin/primar să o schimbe.
 * @param farmerId - ID-ul fermierului vizat.
 * @param passwordData - Include parola nouă și, opțional, cea veche.
 * @param actorId - ID-ul celui care face schimbarea.
 * @param isSelfChange - Flag ce indică dacă fermierul își schimbă propria parolă.
 * @returns Un obiect cu statusul operațiunii.
 */
export async function changeFarmerPassword(
    farmerId: string,
    passwordData: ChangeFarmerPasswordData,
    actorId: string,
    isSelfChange: boolean = false
): Promise<{ success: boolean; error?: string }> {
    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
        return { success: false, error: "Parola nouă trebuie să aibă cel puțin 8 caractere." };
    }

    try {
        const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
        if (!farmer) {
            return { success: false, error: `Agricultorul cu ID ${farmerId} nu a fost găsit.` };
        }

        if (isSelfChange) {
            if (!passwordData.oldPassword) {
                return { success: false, error: "Parola veche este necesară." };
            }
            const isOldPasswordCorrect = await bcrypt.compare(passwordData.oldPassword, farmer.password);
            if (!isOldPasswordCorrect) {
                return { success: false, error: "Parola veche este incorectă." };
            }
        }

        const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, SALT_ROUNDS);
        await prisma.farmer.update({
            where: { id: farmerId },
            data: { password: hashedNewPassword, mustChangePassword: false }, // Resetează flag-ul
        });

        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Changed Farmer Password', `Farmer ID: ${farmerId}, Name: ${farmer.name}.`);
        return { success: true };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error.';
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Change Farmer Password', `Farmer ID: ${farmerId}, Error: ${errorMsg}`);
        return { success: false, error: `Eroare la schimbarea parolei: ${errorMsg}` };
    }
}

/**
 * Resetează parola unui fermier de către un primar, generând o parolă temporară.
 * @param farmerId - ID-ul fermierului vizat.
 * @param actorId - ID-ul primarului care efectuează resetarea.
 * @returns Un obiect cu statusul și parola temporară.
 */
export async function resetFarmerPasswordByMayor(
    farmerId: string,
    actorId: string
): Promise<{ success: boolean; temporaryPassword?: string; error?: string }> {
    console.log(`[FarmerService] Mayor ${actorId} resetting password for farmer ${farmerId}`);
    try {
        const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
        if (!farmer) {
            return { success: false, error: `Agricultorul cu ID ${farmerId} nu a fost găsit.` };
        }

        const temporaryPassword = Math.random().toString(36).slice(2, 12); // Parolă aleatorie de 10 caractere
        const hashedTemporaryPassword = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

        await prisma.farmer.update({
            where: { id: farmerId },
            data: { password: hashedTemporaryPassword, mustChangePassword: true },
        });

        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Reset Farmer Password', `Farmer ID: ${farmerId}, Name: ${farmer.name}.`);
        return { success: true, temporaryPassword };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error.';
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Reset Farmer Password', `Farmer ID: ${farmerId}, Error: ${errorMsg}`);
        return { success: false, error: `Eroare la resetarea parolei: ${errorMsg}` };
    }
}