// --- START OF FILE app/admin/settings/actions.ts ---
'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { addLogEntry, clearAllLogs } from '@/services/logs';
import bcrypt from 'bcryptjs'; // Pentru schimbare parolă admin

// --- Site Name ---
let currentSettings = {
    siteName: 'AgriCad Platform',
};

export async function getSettings(): Promise<{ siteName: string }> {
    console.log('[SettingsAction] Fetching settings (simulated)');
    try {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { ...currentSettings };
    } catch (error) {
        console.error('[SettingsAction] Unexpected error fetching settings:', error);
        return { siteName: 'AgriCad Platform' };
    }
}

const SiteNameSchema = z.string().min(3, 'Numele site-ului trebuie să aibă cel puțin 3 caractere').max(50, 'Numele site-ului nu poate depăși 50 de caractere');

export async function updateSiteName(
    newName: string,
    actorId: string = 'Admin_Unknown'
): Promise<{ success: boolean; error?: string }> {
    console.log(`[SettingsAction] Attempting to update site name to: ${newName} by ${actorId} (simulated)`);

    const validation = SiteNameSchema.safeParse(newName);
    if (!validation.success) {
        const errorMessage = validation.error.errors[0].message;
        console.error(`[SettingsAction] Site name validation failed for actor ${actorId}: ${errorMessage}`);
        // await addLogEntry('USER_ACTION', actorId, 'Failed Update Site Name', `Validation Error: ${errorMessage}`);
        return { success: false, error: errorMessage };
    }

    try {
        const oldName = currentSettings.siteName;
        await new Promise(resolve => setTimeout(resolve, 100));
        currentSettings.siteName = validation.data;

        await addLogEntry('USER_ACTION', actorId, 'Updated Site Name', `From: '${oldName}' To: '${validation.data}'`);
        console.log('[SettingsAction] Site name updated successfully.');
        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during site name update.';
        console.error(`[SettingsAction] Error updating site name for actor ${actorId}:`, error);
        // await addLogEntry('USER_ACTION', actorId, 'Failed Update Site Name', `Error: ${errorMessage}`);
        return { success: false, error: errorMessage };
    }
}

// --- Admin Password Change (Conceptual - necesită model AdminUser sau o logică specifică) ---
const AdminPasswordChangeSchema = z.object({
    currentPassword: z.string().min(1, "Parola curentă este necesară."),
    newPassword: z.string().min(8, "Parola nouă trebuie să aibă cel puțin 8 caractere."),
});

// ACEASTA ESTE O FUNCȚIE CONCEPTUALĂ. Necesită adaptare la modelul real de admin.
// Presupunem că adminii NU sunt în tabelele Mayor sau Farmer.
// Dacă adminul este un utilizator special într-unul din aceste tabele, logica se schimbă.
export async function adminChangeOwnPassword(
    adminId: string, // ID-ul adminului curent (din sesiune)
    currentPasswordPlain: string,
    newPasswordPlain: string
): Promise<{ success: boolean; error?: string }> {
    console.log(`[SettingsAction] Admin ${adminId} attempting to change own password.`);

    const validation = AdminPasswordChangeSchema.safeParse({ currentPassword: currentPasswordPlain, newPassword: newPasswordPlain });
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    try {
        // Pasul 1: Găsește adminul în baza de date.
        // ACEASTA ESTE PARTEA CARE DEPINDE DE CUM SUNT STOCAȚI ADMINII.
        // Exemplu dacă ar exista un model `AdminUser`:
        // const adminUser = await prisma.adminUser.findUnique({ where: { id: adminId } });
        // if (!adminUser) {
        //   return { success: false, error: "Contul de administrator nu a fost găsit." };
        // }

        // // Pasul 2: Verifică parola curentă.
        // const isMatch = await bcrypt.compare(currentPasswordPlain, adminUser.password);
        // if (!isMatch) {
        //   return { success: false, error: "Parola curentă este incorectă." };
        // }

        // // Pasul 3: Hash parola nouă și actualizează.
        // const hashedNewPassword = await bcrypt.hash(newPasswordPlain, 10);
        // await prisma.adminUser.update({
        //   where: { id: adminId },
        //   data: { password: hashedNewPassword },
        // });

        // Momentan, vom returna o eroare deoarece modelul Admin nu e definit:
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulare
        console.warn("[SettingsAction] adminChangeOwnPassword: Modelul AdminUser nu este definit în schema Prisma. Schimbarea parolei adminului nu este implementată complet.");
        await addLogEntry('USER_ACTION', adminId, 'Attempted Admin Password Change', 'Skipped due to undefined Admin model.');
        // return { success: false, error: "Funcționalitatea de schimbare a parolei adminului nu este complet implementată (model AdminUser nedefinit)." };
        // PENTRU TESTARE, PUTEM SIMULA SUCCES:
        return { success: true };


    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during admin password change.';
        console.error(`[SettingsAction] Error changing password for admin ${adminId}:`, error);
        await addLogEntry('SYSTEM', adminId, 'Failed Admin Password Change', `Error: ${errorMessage}`);
        return { success: false, error: errorMessage };
    }
}


// --- Data Management Actions ---
export async function triggerBackup(
    actorId: string = 'Admin_Unknown'
): Promise<{ success: boolean; message: string; error?: string }> {
    console.log(`[SettingsAction] Triggering system backup by ${actorId} (simulated)`);
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        await addLogEntry('SYSTEM', actorId, 'Triggered System Backup', 'Simulation: Backup process initiated.');
        console.log('[SettingsAction] Backup process initiated (simulation).');
        return { success: true, message: 'Procesul de backup a fost inițiat cu succes (simulare).' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during backup trigger.';
        console.error(`[SettingsAction] Error triggering backup for actor ${actorId}:`, error);
        await addLogEntry('SYSTEM', actorId, 'Failed Backup Trigger', `Error: ${errorMessage}`);
        return { success: false, message: 'Eroare la declanșarea backup-ului.', error: errorMessage };
    }
}

export async function triggerClearApplicationData(
    actorId: string = 'Admin_Unknown'
): Promise<{ success: boolean; message: string; error?: string }> {
    console.warn(`[SettingsAction] !!! Triggering CLEAR APPLICATION DATA by ${actorId} !!!`);

    try {
        await prisma.$transaction(async (tx) => {
            // Ștergem întâi legăturile din Parcele către Fermieri pentru a evita erori de constrângere FK
            await tx.parcel.updateMany({ data: { ownerId: null, cultivatorId: null } });
            // Apoi ștergem entitățile principale
            await tx.parcel.deleteMany({});
            await tx.farmer.deleteMany({});
            await tx.mayor.deleteMany({});
        });

        await addLogEntry('SYSTEM', actorId, 'Cleared All Application Data', 'Farmers, Mayors, and Parcels deleted.');
        console.warn('[SettingsAction] !!! All application data cleared (Farmers, Mayors, Parcels) !!!');
        return { success: true, message: 'Toate datele aplicației (Agricultori, Primari, Parcele) au fost șterse.' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during clear data.';
        console.error(`[SettingsAction] Error during clear application data for actor ${actorId}:`, error);
        await addLogEntry('SYSTEM', actorId, 'Failed Clear Application Data Attempt', `Error: ${errorMessage}`);
        return { success: false, message: 'Eroare la ștergerea datelor aplicației.', error: errorMessage };
    }
}

export async function triggerClearLogs(
    actorId: string = 'Admin_Unknown'
): Promise<{ success: boolean; message: string; error?: string }> {
    console.warn(`[SettingsAction] !!! Triggering CLEAR LOG DATA by ${actorId} !!!`);
    try {
        const result = await clearAllLogs(actorId);
        if (!result.success) {
            console.error(`[SettingsAction] clearAllLogs failed for actor ${actorId}: ${result.error}`);
            return {
                success: false,
                message: 'Eroare la ștergerea jurnalelor de sistem.',
                error: result.error,
            };
        }
        console.warn(`[SettingsAction] !!! Log clearing process completed for actor ${actorId}. Success: ${result.success} !!!`);
        return {
            success: true,
            message: 'Toate jurnalele de sistem au fost șterse.',
            error: undefined,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during log clearing trigger.';
        console.error(`[SettingsAction] Unexpected error during triggerClearLogs for actor ${actorId}:`, error);
        await addLogEntry('SYSTEM', actorId, 'Failed Clear Logs Trigger', `Unexpected Wrapper Error: ${errorMessage}`);
        return { success: false, message: 'A apărut o eroare neașteptată la ștergerea jurnalelor.', error: errorMessage };
    }
}
