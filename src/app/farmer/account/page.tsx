// src/app/farmer/account/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCircle, KeyRound, AlertCircle, MapPin, ListChecks } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getFarmerById, changeFarmerPassword, Farmer } from '@/services/farmers'; // Asigură-te că Farmer e tipul corect
import { getParcelsByOwner, getParcelsByCultivator, Parcel } from '@/services/parcels';
import { useFarmerVillageContext } from '@/components/layout/FarmerLayoutClient'; // Pentru operationalVillages

const t = {
    pageTitle: "Contul meu de agricultor",
    pageDescription: "Vizualizați și actualizați detaliile contului dvs. și schimbați parola.",
    accountDetailsCardTitle: "Detalii cont",
    primaryVillageLabel: "Sat principal de înregistrare:",
    operationalVillagesLabel: "Sate cu activitate (parcele):",
    noOperationalVillages: "Nicio parcelă înregistrată.",
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

// Tip pentru user-ul din sesiune (ar trebui definit global în next-auth.d.ts)
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; village?: string };

export default function FarmerAccountPage() {
    const { data: session, status: sessionStatus } = useSession();
    const { operationalVillages, isFarmContextLoading: isOpVillagesLoading } = useFarmerVillageContext(); // Preluăm satele operaționale
    const { toast } = useToast();

    const [farmerDetails, setFarmerDetails] = useState<Omit<Farmer, 'password'> | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const typedUser = session?.user as SessionUser | undefined;

    const fetchFarmerDetails = useCallback(async () => {
        if (sessionStatus === 'authenticated' && typedUser?.id) {
            setIsLoadingDetails(true);
            setErrorDetails(null);
            try {
                const details = await getFarmerById(typedUser.id);
                if (details) {
                    setFarmerDetails(details);
                } else {
                    throw new Error("Nu s-au putut prelua detaliile contului de agricultor.");
                }
            } catch (err) {
                console.error("Error fetching farmer details:", err);
                setErrorDetails(err instanceof Error ? err.message : "A apărut o eroare la încărcarea detaliilor.");
            } finally {
                setIsLoadingDetails(false);
            }
        } else if (sessionStatus !== 'loading') {
            setIsLoadingDetails(false); // Finalizează încărcarea dacă sesiunea nu e ok
        }
    }, [sessionStatus, typedUser?.id]);

    useEffect(() => {
        fetchFarmerDetails();
    }, [fetchFarmerDetails]);

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
        if (!typedUser?.id) {
            toast({ variant: "destructive", title: t.errorTitle, description: "Sesiune invalidă sau ID utilizator lipsă." });
            setIsUpdatingPassword(false);
            return;
        }

        try {
            const result = await changeFarmerPassword(
                typedUser.id,
                { oldPassword: oldPassword, newPassword: newPassword },
                typedUser.id, // Actorul este agricultorul însuși
                true // Este o auto-schimbare, deci parola veche e necesară
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

    const isLoadingPage = sessionStatus === 'loading' || isLoadingDetails || isOpVillagesLoading;

    if (isLoadingPage) {
        return (
            <div className="flex-1 p-4 sm:p-6 space-y-6">
                <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3 mb-1" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-5 w-3/5" /><Skeleton className="h-10 w-full mt-4" /></CardContent></Card>
                <Card className="shadow-md"><CardHeader><Skeleton className="h-6 w-1/3 mb-1" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-1/3 mt-2" /></CardContent></Card>
            </div>
        );
    }

    if (errorDetails) { return (<div className="flex-1 p-4 sm:p-6"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t.errorTitle}</AlertTitle><AlertDescription>{errorDetails}</AlertDescription></Alert></div>); }
    if (!farmerDetails) { return (<div className="flex-1 p-4 sm:p-6"><Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Date indisponibile</AlertTitle><AlertDescription>Nu s-au putut încărca detaliile contului.</AlertDescription></Alert></div>); }

    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className="shadow-md">
                <CardHeader> <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5" /> {t.pageTitle}</CardTitle> <CardDescription>{t.pageDescription}</CardDescription> </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-sm">
                    <CardHeader> <CardTitle className="text-lg">{t.accountDetailsCardTitle}</CardTitle> </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Nume:</span><span>{farmerDetails.name}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Email:</span><span>{farmerDetails.email || t.notAvailable}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Telefon:</span><span>{farmerDetails.phone || t.notAvailable}</span></div>
                        <div className="flex justify-between items-center"><span className="font-medium text-muted-foreground">Culoare hartă:</span> {farmerDetails.color ? <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border" style={{ backgroundColor: farmerDetails.color }}></div><span className="font-mono text-xs">{farmerDetails.color}</span></div> : <span>Automată</span>}</div>
                        <Separator />
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">{t.primaryVillageLabel}</span><span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" />{farmerDetails.village || t.notAvailable}</span></div>
                        <div>
                            <span className="font-medium text-muted-foreground block mb-1">{t.operationalVillagesLabel}</span>
                            {operationalVillages && operationalVillages.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {operationalVillages.map(village => (<Badge key={village} variant="outline" className="text-xs"><ListChecks className="h-3 w-3 mr-1.5" />{village}</Badge>))}
                                </div>
                            ) : (<span className="text-muted-foreground">{t.noOperationalVillages}</span>)}
                        </div>
                        <Separator />
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Cod fiscal:</span><span>{farmerDetails.companyCode}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Cont creat la:</span><span className="text-muted-foreground text-xs">{new Date(farmerDetails.createdAt).toLocaleDateString()}</span></div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader> <CardTitle className="text-lg">{t.changePasswordCardTitle}</CardTitle> <CardDescription>{t.changePasswordCardDescription}</CardDescription> </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div> <Label htmlFor="oldPassword">{t.oldPasswordLabel}</Label> <Input id="oldPassword" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required disabled={isUpdatingPassword} /> </div>
                            <div> <Label htmlFor="newPassword">{t.newPasswordLabel}</Label> <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t.newPasswordPlaceholder} required minLength={8} disabled={isUpdatingPassword} /> </div>
                            <div> <Label htmlFor="confirmNewPassword">{t.confirmNewPasswordLabel}</Label> <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required minLength={8} disabled={isUpdatingPassword} /> </div>
                            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                            <Button type="submit" disabled={isUpdatingPassword || !oldPassword || !newPassword || !confirmNewPassword || newPassword.length < 8 || newPassword !== confirmNewPassword} className="w-full"> {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isUpdatingPassword ? t.updatingPasswordButton : t.updatePasswordButton} <KeyRound className="ml-2 h-4 w-4" /> </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}