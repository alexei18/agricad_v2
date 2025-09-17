// src/app/mayor/account/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, Suspense } from 'react'; // Adăugat useCallback
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, KeyRound, AlertCircle, ShieldCheck, CalendarDays, ListChecks } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getMayorById, changeMayorPassword, type MayorWithManagedVillages } from '@/services/mayors';

// ... (const t rămâne la fel)
const t = {
    pageTitle: "Contul meu",
    pageDescription: "Vizualizați și actualizați detaliile contului dvs.",
    accountDetailsCardTitle: "Detalii cont primar",
    managedVillagesLabel: "Sate gestionate:",
    subscriptionStatusLabel: "Status abonament:",
    subscriptionEndDateLabel: "Dată expirare abonament:",
    noVillagesManaged: "Niciun sat gestionat.",
    changePasswordCardTitle: "Schimbă parola",
    changePasswordCardDescription: "Introduceți parola veche și cea nouă pentru a actualiza parola contului.",
    oldPasswordLabel: "Parolă veche *",
    newPasswordLabel: "Parolă nouă *",
    newPasswordPlaceholder: "Minim 8 caractere",
    confirmNewPasswordLabel: "Confirmă parola nouă *",
    passwordsDoNotMatch: "Parolele noi nu se potrivesc.",
    updatePasswordButton: "Actualizează parola",
    updatingPasswordButton: "Se actualizează...",
    errorTitle: "Eroare",
    successTitle: "Succes",
    passwordChangedSuccess: "Parola a fost schimbată cu succes!",
    loadingAccountDetails: "Se încarcă detaliile contului...",
    notAvailable: "N/A",
};


function MayorAccountPageContent() {
    const { data: session, status: sessionStatus } = useSession(); // eliminat updateSession dacă nu e folosit direct
    const { toast } = useToast();

    const [mayorDetails, setMayorDetails] = useState<Omit<MayorWithManagedVillages, 'password'> | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    // Tip pentru user-ul din sesiune (ar trebui definit global în next-auth.d.ts)
    type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; villages?: string[] };


    const fetchMayorDetails = useCallback(async () => {
        const typedUser = session?.user as SessionUser; // Type assertion
        if (sessionStatus === 'authenticated' && typedUser?.id) {
            setIsLoadingDetails(true);
            setErrorDetails(null);
            try {
                const details = await getMayorById(typedUser.id);
                if (details) {
                    setMayorDetails(details as Omit<MayorWithManagedVillages, 'password'>);
                } else {
                    throw new Error("Nu s-au putut prelua detaliile primarului.");
                }
            } catch (err) {
                console.error("Error fetching mayor details:", err);
                setErrorDetails(err instanceof Error ? err.message : "A apărut o eroare.");
            } finally {
                setIsLoadingDetails(false);
            }
        } else if (sessionStatus === 'authenticated' && !typedUser?.id) {
            setErrorDetails("ID utilizator negăsit în sesiune.");
            setIsLoadingDetails(false);
        }
    }, [session, sessionStatus]);

    useEffect(() => {
        fetchMayorDetails();
    }, [fetchMayorDetails]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError(null);
        if (newPassword !== confirmNewPassword) {
            setPasswordError(t.passwordsDoNotMatch);
            toast({ variant: "destructive", title: t.errorTitle, description: t.passwordsDoNotMatch });
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError("Parola nouă trebuie să aibă cel puțin 8 caractere.");
            toast({ variant: "destructive", title: t.errorTitle, description: "Parola nouă trebuie să aibă cel puțin 8 caractere." });
            return;
        }

        setIsUpdatingPassword(true);
        const typedUser = session?.user as SessionUser;
        if (!typedUser?.id) {
            toast({ variant: "destructive", title: t.errorTitle, description: "Sesiune invalidă sau ID utilizator lipsă." });
            setIsUpdatingPassword(false);
            return;
        }

        try {
            const result = await changeMayorPassword(
                typedUser.id,
                { oldPassword: oldPassword, newPassword: newPassword },
                typedUser.id,
                true
            );

            if (result.success) {
                toast({ title: t.successTitle, description: t.passwordChangedSuccess });
                setOldPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            } else {
                throw new Error(result.error || "Nu s-a putut schimba parola.");
            }
        } catch (error) {
            console.error("Failed to change password:", error);
            const errorMessage = error instanceof Error ? error.message : "A apărut o eroare necunoscută.";
            setPasswordError(errorMessage);
            toast({ variant: "destructive", title: t.errorTitle, description: errorMessage });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    // ... (restul componentei - JSX - rămâne la fel ca în răspunsul anterior)
    if (sessionStatus === 'loading' || isLoadingDetails) {
        return ( /* Skeleton */ <div className="flex-1 p-4 sm:p-6 space-y-6"><Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3 mb-1" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-5 w-3/5" /><Skeleton className="h-10 w-full mt-4" /></CardContent></Card><Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3 mb-1" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-1/3 mt-2" /></CardContent></Card></div>);
    }
    if (errorDetails) { return (<div className="flex-1 p-4 sm:p-6"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t.errorTitle}</AlertTitle><AlertDescription>{errorDetails}</AlertDescription></Alert></div>); }
    if (!mayorDetails) { return (<div className="flex-1 p-4 sm:p-6"><Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Date indisponibile</AlertTitle><AlertDescription>Nu s-au putut încărca detaliile contului.</AlertDescription></Alert></div>); }

    const statusDisplay: Record<string, { text: string, icon: React.ElementType, colorClass?: string }> = { // colorClass e opțional
        ACTIVE: { text: 'Activ', icon: ShieldCheck, colorClass: 'text-white' }, PENDING: { text: 'În așteptare', icon: AlertCircle, colorClass: 'text-yellow-600' }, INACTIVE: { text: 'Inactiv', icon: AlertCircle, colorClass: 'text-red-600' },
    };
    const currentStatusInfo = statusDisplay[mayorDetails.subscriptionStatus] || { text: mayorDetails.subscriptionStatus, icon: AlertCircle };

    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className="shadow-md"><CardHeader><CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5" /> {t.pageTitle}</CardTitle><CardDescription>{t.pageDescription}</CardDescription></CardHeader></Card>
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-sm"><CardHeader><CardTitle className="text-lg">{t.accountDetailsCardTitle}</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Nume:</span><span>{mayorDetails.name}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Email:</span><span>{mayorDetails.email}</span></div>
                        <Separator />
                        <div><span className="font-medium text-muted-foreground block mb-1">{t.managedVillagesLabel}</span>
                            {mayorDetails.managedVillages && mayorDetails.managedVillages.length > 0 ? (<div className="flex flex-wrap gap-2">{mayorDetails.managedVillages.map(village => (<Badge key={village.id} variant="secondary" className="text-xs"><ListChecks className="h-3 w-3 mr-1.5" />{village.name}</Badge>))}</div>) : (<span className="text-muted-foreground">{t.noVillagesManaged}</span>)}
                        </div><Separator />
                        <div className="flex justify-between items-center"><span className="font-medium text-muted-foreground">{t.subscriptionStatusLabel}</span><Badge variant={mayorDetails.subscriptionStatus === 'ACTIVE' ? 'default' : mayorDetails.subscriptionStatus === 'PENDING' ? 'outline' : 'destructive'} className={`flex items-center gap-1.5 ${currentStatusInfo.colorClass || ''}`}><currentStatusInfo.icon className="h-3.5 w-3.5" />{currentStatusInfo.text}</Badge></div>
                        {mayorDetails.subscriptionStatus === 'ACTIVE' && mayorDetails.subscriptionEndDate && (<div className="flex justify-between"><span className="font-medium text-muted-foreground">{t.subscriptionEndDateLabel}</span><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-muted-foreground" />{new Date(mayorDetails.subscriptionEndDate).toLocaleDateString()}</span></div>)}
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Cont creat la:</span><span className="text-muted-foreground text-xs">{new Date(mayorDetails.createdAt).toLocaleDateString()}</span></div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm"><CardHeader><CardTitle className="text-lg">{t.changePasswordCardTitle}</CardTitle><CardDescription>{t.changePasswordCardDescription}</CardDescription></CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div><Label htmlFor="oldPassword">{t.oldPasswordLabel}</Label><Input id="oldPassword" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required disabled={isUpdatingPassword} /></div>
                            <div><Label htmlFor="newPassword">{t.newPasswordLabel}</Label><Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t.newPasswordPlaceholder} required minLength={8} disabled={isUpdatingPassword} /></div>
                            <div><Label htmlFor="confirmNewPassword">{t.confirmNewPasswordLabel}</Label><Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required minLength={8} disabled={isUpdatingPassword} /></div>
                            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                            <Button type="submit" disabled={isUpdatingPassword || !oldPassword || !newPassword || !confirmNewPassword || newPassword.length < 8 || newPassword !== confirmNewPassword} className="w-full">{isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isUpdatingPassword ? t.updatingPasswordButton : t.updatePasswordButton}<KeyRound className="ml-2 h-4 w-4" /></Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function MayorAccountPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MayorAccountPageContent />
        </Suspense>
    );
}