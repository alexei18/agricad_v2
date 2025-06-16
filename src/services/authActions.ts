// src/services/authActions.ts
'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { addLogEntry } from './logs';
import type { LogType as PrismaLogType } from '@prisma/client';

export async function setInitialPassword({ userId, userType, newPassword }: { userId: string, userType: 'mayor' | 'farmer', newPassword: string }): Promise<{ success: boolean, error?: string }> {
    if (!newPassword || newPassword.length < 8) {
        return { success: false, error: 'Parola trebuie să aibă cel puțin 8 caractere.' };
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        if (userType === 'mayor') {
            await prisma.mayor.update({
                where: { id: userId },
                data: {
                    password: hashedPassword,
                    mustChangePassword: false, // Important!
                },
            });
        } else if (userType === 'farmer') {
            await prisma.farmer.update({
                where: { id: userId },
                data: {
                    password: hashedPassword,
                    mustChangePassword: false, // Important!
                },
            });
        } else {
            throw new Error('Tip de utilizator invalid.');
        }

        await addLogEntry('USER_ACTION' as PrismaLogType, userId, 'Set Initial Password', `User ID: ${userId}, Type: ${userType}`);
        return { success: true };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Eroare necunoscută la setarea parolei inițiale.";
        await addLogEntry('ERROR' as PrismaLogType, userId, 'Failed Set Initial Password', `User ID: ${userId}, Type: ${userType}, Error: ${errorMessage}`);
        return { success: false, error: errorMessage };
    }
}

export async function changeOwnPassword({ userId, userType, oldPassword, newPassword }: { userId: string, userType: 'admin' | 'mayor' | 'farmer', oldPassword: string, newPassword: string }): Promise<{ success: boolean, error?: string }> {
    if (!oldPassword || !newPassword || newPassword.length < 8) {
        return { success: false, error: 'Toate câmpurile sunt obligatorii, iar parola nouă trebuie să aibă cel puțin 8 caractere.' };
    }
    if (oldPassword === newPassword) {
        return { success: false, error: 'Parola nouă trebuie să fie diferită de cea veche.' };
    }

    try {
        let user;
        if (userType === 'mayor') {
            user = await prisma.mayor.findUnique({ where: { id: userId } });
        } else if (userType === 'farmer') {
            user = await prisma.farmer.findUnique({ where: { id: userId } });
        } else if (userType === 'admin') {
            // Logica pentru admin poate fi diferită (ex: parola nu e în DB)
            return { success: false, error: 'Schimbarea parolei de admin nu se face aici.' };
        }

        if (!user) {
            throw new Error('Utilizator negăsit.');
        }

        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordCorrect) {
            return { success: false, error: 'Parola veche este incorectă.' };
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        if (userType === 'mayor') {
            await prisma.mayor.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
            });
        } else if (userType === 'farmer') {
            await prisma.farmer.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
            });
        }

        await addLogEntry('USER_ACTION' as PrismaLogType, userId, 'Changed Own Password', `User ID: ${userId}`);
        return { success: true };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Eroare necunoscută la schimbarea parolei.";
        await addLogEntry('ERROR' as PrismaLogType, userId, 'Failed Change Own Password', `User ID: ${userId}, Error: ${errorMessage}`);
        return { success: false, error: errorMessage };
    }
}