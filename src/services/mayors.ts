// src/services/mayors.ts
'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import necesar pentru tipuri complexe Prisma
import type { Mayor as PrismaMayor, Village as PrismaVillage, Status, LogType as PrismaLogType } from '@prisma/client';
import { addLogEntry } from './logs';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Tipul Mayor pentru aplicație, include satele gestionate
export type MayorWithManagedVillages = Omit<PrismaMayor, 'password'> & {
    managedVillages: Pick<PrismaVillage, 'id' | 'name'>[];
};

// Tipul pentru datele de adăugare primar
export type AddMayorData = Pick<PrismaMayor, 'name' | 'email' | 'password'> & {
    villageNames: string[];
// Adăugați `mustChangePassword?: boolean;` dacă e relevant la creare
  };

// Tipul pentru actualizarea detaliilor
export type UpdateMayorDetailsData = Partial<Pick<PrismaMayor, 'name' | 'email'>> & {
    villageNames?: string[];
};

function mapPrismaMayorToApp(
    mayor: PrismaMayor & { managedVillages?: Pick<PrismaVillage, 'id' | 'name'>[] }
): MayorWithManagedVillages {
    const { password, ...rest } = mayor;
    return {
        ...rest,
        managedVillages: mayor.managedVillages || [],
    };
}

export async function getAllMayors(): Promise<Omit<MayorWithManagedVillages, 'password'>[]> {
    console.log('[MayorService] Fetching all mayors with their villages from DB');
    try {
        const mayorsWithVillages = await prisma.mayor.findMany({
            orderBy: [{ name: 'asc' }],
            select: { // Select explicit pentru a omite parola și a include satele
                id: true,
                name: true,
                email: true,
                subscriptionStatus: true,
                subscriptionEndDate: true,
                createdAt: true,
                updatedAt: true,
                managedVillages: {
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' },
                },
            },
        });
        // Nu mai este necesară maparea manuală complexă dacă select returnează structura dorită (fără parolă)
        return mayorsWithVillages as Omit<MayorWithManagedVillages, 'password'>[];
    } catch (error) {
        console.error('[MayorService] Error fetching all mayors:', error);
        throw new Error('Nu s-au putut încărca datele primarilor.');
    }
}

export async function getMayorById(id: string): Promise<Omit<MayorWithManagedVillages, 'password'> | null> {
    console.log(`[MayorService] Fetching mayor by ID: ${id} with villages from DB`);
    try {
        const mayorWithVillages = await prisma.mayor.findUnique({
            where: { id: id },
            select: { // Select explicit
                id: true,
                name: true,
                email: true,
                subscriptionStatus: true,
                subscriptionEndDate: true,
                createdAt: true,
                updatedAt: true,
                managedVillages: {
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' },
                },
            },
        });
        return mayorWithVillages as Omit<MayorWithManagedVillages, 'password'> | null;
    } catch (error) {
        console.error(`[MayorService] Error fetching mayor ${id}:`, error);
        throw new Error('Nu s-au putut încărca datele primarului.');
    }
}

export async function addMayor(
    mayorData: AddMayorData, // Acum include `password` datorită Omit-ului pe PrismaMayor
    actorId: string = 'Admin_Unknown'
): Promise<{ success: boolean; id?: string; error?: string }> {
    const { villageNames, password: plainPassword, ...restMayorData } = mayorData;
    console.log(`[MayorService] Adding new mayor by ${actorId}:`, { ...restMayorData, password: '***', villageNames: villageNames.join(', ') });

    if (!restMayorData.name || !villageNames || villageNames.length === 0 || !restMayorData.email || !plainPassword) {
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Add Mayor', `Error: Missing required fields (name, villageNames, email, password).`);
        return { success: false, error: "Lipsesc câmpurile obligatorii (nume, sate, email, parolă)." };
    }
    if (plainPassword.length < 8) {
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Add Mayor', `Error: Password too short.`);
        return { success: false, error: "Parola trebuie să aibă cel puțin 8 caractere." };
    }

    const uniqueVillageNames = [...new Set(villageNames.map(v => v.trim()).filter(v => v.length > 0))];
    if (uniqueVillageNames.length === 0) {
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Add Mayor', `Error: No valid villages provided.`);
        return { success: false, error: "Trebuie specificat cel puțin un sat valid." };
    }

    try {
        const existingByEmail = await prisma.mayor.findUnique({ where: { email: restMayorData.email } });
        if (existingByEmail) {
            await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Add Mayor', `Error: Email ${restMayorData.email} exists.`);
            return { success: false, error: `Un primar cu email-ul ${restMayorData.email} există deja.` };
        }

        const villagesAlreadyManaged = await prisma.village.findMany({
            where: { name: { in: uniqueVillageNames } },
            include: { mayor: { select: { name: true } } }
        });

        if (villagesAlreadyManaged.length > 0) {
            const conflictDetails = villagesAlreadyManaged.map(v => `${v.name} (gestionat de ${v.mayor?.name || 'altcineva'})`).join(', ');
            const errorMsg = `Următoarele sate sunt deja gestionate: ${conflictDetails}. Un sat poate fi atribuit unui singur primar.`;
            await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Add Mayor', `Error: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }

        const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

        const newMayorWithVillages = await prisma.$transaction(async (tx) => {
            const createdMayor = await tx.mayor.create({
                data: {
                    ...restMayorData,
                    password: hashedPassword,
                    subscriptionStatus: 'PENDING',
                    subscriptionEndDate: null,
                    // `managedVillages` va fi creată separat și legată
                },
            });

            const villageCreateOps = uniqueVillageNames.map(villageName =>
                tx.village.create({
                    data: {
                        name: villageName,
                        mayorId: createdMayor.id,
                    }
                })
            );
            await Promise.all(villageCreateOps);

            // Returnează primarul cu satele populate pentru logare
            return tx.mayor.findUniqueOrThrow({
                where: { id: createdMayor.id },
                select: { id: true, name: true, managedVillages: { select: { name: true } } } // Selectează doar ce e necesar
            });
        });

        const villageNamesForLog = newMayorWithVillages.managedVillages.map(v => v.name).join(', ');
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Added Mayor', `ID: ${newMayorWithVillages.id}, Name: ${newMayorWithVillages.name}, Villages: ${villageNamesForLog}, Status: PENDING`);
        console.log(`[MayorService] Mayor added with ID: ${newMayorWithVillages.id} managing villages: ${villageNamesForLog}`);
        return { success: true, id: newMayorWithVillages.id };

    } catch (error) {
        console.error('[MayorService] Error adding mayor:', error);
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Add Mayor', `Database Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        return { success: false, error: `Eroare bază de date: ${error instanceof Error ? error.message : 'Nu s-a putut adăuga primarul.'}` };
    }
}

export async function updateMayorDetails(
    id: string,
    dataToUpdate: UpdateMayorDetailsData,
    actorId: string = 'Admin_Unknown'
): Promise<{ success: boolean; error?: string; message?: string }> {
    console.log(`[MayorService] Updating mayor details for ${id} by ${actorId}:`, dataToUpdate);

    try {
        const currentMayor = await prisma.mayor.findUnique({
            where: { id },
            include: { managedVillages: { select: { id: true, name: true } } }
        });

        if (!currentMayor) {
            await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Update Mayor Details', `Error: Mayor ID ${id} not found.`);
            return { success: false, error: `Primarul cu ID ${id} nu a fost găsit.` };
        }

        const prismaUpdateData: Prisma.MayorUpdateInput = {};
        let newVillageNamesForLog: string[] | undefined = undefined;

        if (dataToUpdate.name && dataToUpdate.name !== currentMayor.name) {
            prismaUpdateData.name = dataToUpdate.name;
        }

        if (dataToUpdate.email && dataToUpdate.email !== currentMayor.email) {
            const existingByEmail = await prisma.mayor.findFirst({ where: { email: dataToUpdate.email, id: { not: id } } });
            if (existingByEmail) {
                await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Update Mayor Details', `Error: Email ${dataToUpdate.email} in use.`);
                return { success: false, error: `Email-ul ${dataToUpdate.email} este deja utilizat.` };
            }
            prismaUpdateData.email = dataToUpdate.email;
        }

        // Verificări preliminare pentru sate, înainte de tranzacție
        if (dataToUpdate.villageNames) {
            const newUniqueVillageNames = [...new Set(dataToUpdate.villageNames.map(v => v.trim()).filter(v => v.length > 0))];
            if (newUniqueVillageNames.length === 0 && currentMayor.managedVillages.length > 0) { // Permite eliminarea tuturor satelor dacă se dorește
                // Aceasta ar însemna că primarul nu mai gestionează niciun sat, ceea ce poate fi valid.
                // Totuși, dacă intenția e "cel puțin un sat", validarea ar fi aici.
                // Pentru flexibilitate, permitem eliminarea tuturor satelor.
            }
            newVillageNamesForLog = newUniqueVillageNames;

            const conflictingVillages = await prisma.village.findMany({
                where: {
                    name: { in: newUniqueVillageNames },
                    mayorId: { not: id }
                },
                include: { mayor: { select: { name: true } } }
            });

            if (conflictingVillages.length > 0) {
                const conflictDetails = conflictingVillages.map(v => `${v.name} (gestionat de ${v.mayor?.name || 'altcineva'})`).join(', ');
                const errorMsg = `Următoarele sate sunt deja gestionate de alți primari: ${conflictDetails}.`;
                return { success: false, error: errorMsg };
            }
        }

        if (Object.keys(prismaUpdateData).length === 0 && !dataToUpdate.villageNames) {
            return { success: true, message: "Nicio modificare detectată." };
        }

        await prisma.$transaction(async (tx) => {
            if (Object.keys(prismaUpdateData).length > 0) {
                await tx.mayor.update({ where: { id }, data: prismaUpdateData });
            }

            if (dataToUpdate.villageNames) {
                const newUniqueVillageNames = [...new Set(dataToUpdate.villageNames.map(v => v.trim()).filter(v => v.length > 0))];
                const currentManagedVillageNames = currentMayor.managedVillages.map(v => v.name);

                const villagesToAdd = newUniqueVillageNames.filter(name => !currentManagedVillageNames.includes(name));
                const villagesToRemove = currentMayor.managedVillages.filter(v => !newUniqueVillageNames.includes(v.name));

                if (villagesToRemove.length > 0) {
                    await tx.village.deleteMany({ where: { id: { in: villagesToRemove.map(v => v.id) }, mayorId: id } });
                }
                if (villagesToAdd.length > 0) {
                    for (const villageName of villagesToAdd) {
                        // Verifică din nou în tranzacție pentru a evita race conditions, deși ar trebui să fie OK.
                        // Sau, dacă un sat e unic global, și nu doar per primar:
                        // const existingVillage = await tx.village.findUnique({ where: { name: villageName }});
                        // if (existingVillage && existingVillage.mayorId !== id) throw new Error(`Satul ${villageName} e deja gestionat.`);
                        // if (!existingVillage)
                        await tx.village.create({ data: { name: villageName, mayorId: id } });
                        // else if (existingVillage.mayorId === null) await tx.village.update({where: {id: existingVillage.id}, data: {mayorId: id}});
                    }
                }
            }
        });

        const oldVillagesString = currentMayor.managedVillages.map(v => v.name).join(', ');
        const newVillagesString = newVillageNamesForLog ? newVillageNamesForLog.join(', ') : oldVillagesString;

        const changesArray = [];
        if (prismaUpdateData.name) changesArray.push(`Nume: '${currentMayor.name}'->'${prismaUpdateData.name}'`);
        if (prismaUpdateData.email) changesArray.push(`Email: '${currentMayor.email}'->'${prismaUpdateData.email}'`);
        if (newVillageNamesForLog && oldVillagesString !== newVillagesString) changesArray.push(`Sate: '${oldVillagesString}'->'${newVillagesString}'`);

        const changes = changesArray.join('; ') || 'Nicio modificare de detaliu.';
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Updated Mayor Details', `ID: ${id}, Changes: ${changes}`);
        return { success: true, message: "Detaliile primarului au fost actualizate." };

    } catch (error) {
        console.error(`[MayorService] Error updating mayor details ${id}:`, error);
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Update Mayor Details', `ID: ${id}, Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        return { success: false, error: `Eroare bază de date: ${error instanceof Error ? error.message : 'Nu s-au putut actualiza detaliile primarului.'}` };
    }
}


export async function updateMayorStatus(
    id: string,
    status: Status,
    endDate?: Date | null,
    actorId: string = 'Admin_Unknown'
): Promise<{ success: boolean; error?: string }> {
    console.log(`[MayorService] Updating status for mayor ${id} to ${status} by ${actorId}`);
    try {
        const mayor = await prisma.mayor.findUnique({ where: { id } });
        if (!mayor) {
            await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Update Mayor Status', `Error: Mayor ID ${id} not found.`);
            return { success: false, error: `Primarul cu ID ${id} nu a fost găsit.` };
        }
        const oldStatus = mayor.subscriptionStatus;
        const updatedMayor = await prisma.mayor.update({
            where: { id: id },
            data: {
                subscriptionStatus: status,
                subscriptionEndDate: endDate === undefined ? mayor.subscriptionEndDate : endDate,
            },
        });
        const endDateString = updatedMayor.subscriptionEndDate?.toLocaleDateString() || 'N/A';
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Updated Mayor Status', `ID: ${id}, Status: ${oldStatus} -> ${status}, EndDate: ${endDateString}`);
        console.log(`[MayorService] Mayor ${id} status updated successfully.`);
        return { success: true };
    } catch (error) {
        console.error(`[MayorService] Error updating mayor status ${id}:`, error);
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Update Mayor Status', `ID: ${id}, Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        return { success: false, error: `Eroare bază de date: ${error instanceof Error ? error.message : 'Nu s-a putut actualiza starea.'}` };
    }
}

export async function deleteMayor(
    id: string,
    actorId: string = 'Admin_Unknown'
): Promise<{ success: boolean; error?: string }> {
    console.log(`[MayorService] Deleting mayor ${id} by ${actorId}`);
    try {
        const mayor = await prisma.mayor.findUnique({
            where: { id },
            include: { managedVillages: { select: { name: true } } } // Include satele pentru logare
        });
        if (!mayor) {
            await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Delete Mayor', `Error: Mayor ID ${id} not found.`);
            return { success: false, error: `Primarul cu ID ${id} nu a fost găsit.` };
        }

        // Prisma va șterge satele asociate datorită onDelete: Cascade în schema
        await prisma.mayor.delete({
            where: { id: id },
        });

        const villageNamesForLog = mayor.managedVillages.map(v => v.name).join(', ');
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Deleted Mayor', `ID: ${id}, Name: ${mayor.name}, Villages: ${villageNamesForLog}`);
        console.log(`[MayorService] Mayor ${id} and their managed villages deleted successfully.`);
        return { success: true };
    } catch (error) {
        console.error(`[MayorService] Error deleting mayor ${id}:`, error);
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Delete Mayor', `ID: ${id}, Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        return { success: false, error: `Eroare bază de date: ${error instanceof Error ? error.message : 'Nu s-a putut șterge primarul.'}` };
    }
}

type ChangeMayorPasswordData = {
    newPassword: string;
    oldPassword?: string;
};

export async function changeMayorPassword(
    mayorId: string,
    passwordData: ChangeMayorPasswordData,
    actorId: string,
    isSelfChange: boolean = false
): Promise<{ success: boolean; error?: string }> {
    console.log(`[MayorService] Attempting to change password for mayor ${mayorId} by actor ${actorId}. Self change: ${isSelfChange}`);

    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Change Mayor Password', `Mayor ID: ${mayorId}, Error: New password too short.`);
        return { success: false, error: "Parola nouă trebuie să aibă cel puțin 8 caractere." };
    }

    try {
        const mayor = await prisma.mayor.findUnique({ where: { id: mayorId } });
        if (!mayor) {
            await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Change Mayor Password', `Error: Mayor ID ${mayorId} not found.`);
            return { success: false, error: `Primarul cu ID ${mayorId} nu a fost găsit.` };
        }

        if (isSelfChange) {
            if (!passwordData.oldPassword) {
                await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Change Mayor Password', `Mayor ID: ${mayorId}, Error: Old password not provided for self-change.`);
                return { success: false, error: "Parola veche este necesară pentru auto-schimbare." };
            }
            const isOldPasswordCorrect = await bcrypt.compare(passwordData.oldPassword, mayor.password);
            if (!isOldPasswordCorrect) {
                await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Change Mayor Password', `Mayor ID: ${mayorId}, Error: Old password incorrect.`);
                return { success: false, error: "Parola veche este incorectă." };
            }
        }

        const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, SALT_ROUNDS);

        await prisma.mayor.update({
            where: { id: mayorId },
            data: { password: hashedNewPassword },
        });

        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Changed Mayor Password', `Mayor ID: ${mayorId}, Name: ${mayor.name}.`);
        console.log(`[MayorService] Password changed successfully for mayor ${mayorId}.`);
        return { success: true };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error during password change.';
        console.error(`[MayorService] Error changing password for mayor ${mayorId}:`, errorMsg, error);
        await addLogEntry('USER_ACTION' as PrismaLogType, actorId, 'Failed Change Mayor Password', `Mayor ID: ${mayorId}, Error: ${errorMsg}`);
        return { success: false, error: `Eroare la schimbarea parolei: ${errorMsg}` };
    }
}

export async function resetMayorPasswordByAdmin(
    mayorId: string,
    actorId: string
): Promise<{ success: boolean; temporaryPassword?: string; error?: string }> {
    console.log(`[MayorService] Admin ${actorId} resetting password for mayor ${mayorId}`);

    try {
        const mayor = await prisma.mayor.findUnique({ where: { id: mayorId } });
        if (!mayor) {
            await addLogEntry('ADMIN_ACTION' as PrismaLogType, actorId, 'Failed Reset Mayor Password', `Error: Mayor ID ${mayorId} not found.`);
            return { success: false, error: `Primarul cu ID ${mayorId} nu a fost găsit.` };
        }

        const temporaryPassword = Math.random().toString(36).slice(2, 12); // 10 char random
        const hashedTemporaryPassword = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

        await prisma.mayor.update({
            where: { id: mayorId },
            data: { password: hashedTemporaryPassword },
        });

        await addLogEntry('ADMIN_ACTION' as PrismaLogType, actorId, 'Reset Mayor Password', `Mayor ID: ${mayorId}, Name: ${mayor.name}. Temporary password generated.`);
        console.log(`[MayorService] Password reset for mayor ${mayorId}. Temporary password: ${temporaryPassword}`);
        return { success: true, temporaryPassword };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error during password reset.';
        console.error(`[MayorService] Admin error resetting password for mayor ${mayorId}:`, errorMsg, error);
        await addLogEntry('ADMIN_ACTION' as PrismaLogType, actorId, 'Failed Reset Mayor Password', `Mayor ID: ${mayorId}, Error: ${errorMsg}`);
        return { success: false, error: `Eroare la resetarea parolei: ${errorMsg}` };
    }
}