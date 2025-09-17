// src/app/farmer/support/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Import Button
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Mail, Phone, HelpCircle, MessageSquare, Info } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useFarmerVillageContext } from '@/components/layout/FarmerLayoutClient'; // Pentru context sat, dacă e nevoie

const t = {
    pageTitle: "Suport și Asistență",
    pageDescription: "Aveți întrebări sau aveți nevoie de ajutor? Iată cum ne puteți contacta sau găsi răspunsuri.",
    contactCardTitle: "Contactați Primăria / Administratorul",
    contactYourMayorInfo: "Pentru probleme specifice legate de parcelele din satul dvs., vă rugăm să contactați direct primăria care gestionează satul respectiv.",
    contactAdminForTechnical: "Pentru probleme tehnice generale ale platformei AgriCad:",
    faqCardTitle: "Întrebări frecvente",
    faq1Question: "Cum îmi văd toate parcelele pe hartă?",
    faq1Answer: "Navigați la secțiunea 'Harta parcelelor' din meniu. Puteți selecta satul dorit sau 'Toate satele mele' pentru a vizualiza parcelele.",
    faq2Question: "Cum îmi schimb parola contului?",
    faq2Answer: "Mergeți la secțiunea 'Contul meu' din meniu. Acolo veți găsi opțiunea de a vă schimba parola, introducând parola veche și cea nouă.",
    faq3Question: "Cum pot exporta datele despre parcelele mele?",
    faq3Answer: "În secțiunea 'Export Date' din meniu, puteți selecta satele, tipul parcelelor, coloanele dorite și formatul de export.",
    feedbackCardTitle: "Feedback despre Platformă",
    feedbackDescription: "Dacă aveți sugestii generale pentru îmbunătățirea platformei AgriCad, ne puteți scrie.",
    emailPlatformSupport: "agricad.md@gmail.com",
    platformSupportLabel: "Suport Platformă AgriCad:",
    generalPlatformInfoFor: "Informații pentru",
    notAvailable: "Nespecificat"
};

// Tip pentru user-ul din sesiune
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; village?: string };


export default function FarmerSupportPage() {
    const { data: session } = useSession();
    const { selectedVillageFarm, operationalVillages, isFarmContextLoading } = useFarmerVillageContext();

    const farmerName = (session?.user as SessionUser)?.name || t.notAvailable;
    let contextDisplay = t.notAvailable;

    if (!isFarmContextLoading) {
        if (selectedVillageFarm) {
            contextDisplay = `satul ${selectedVillageFarm}`;
        } else if (operationalVillages.length > 0) {
            contextDisplay = `${operationalVillages.length} ${operationalVillages.length === 1 ? 'sat operațional' : 'sate operaționale'}`;
        } else {
            contextDisplay = "niciun sat cu activitate";
        }
    } else {
        contextDisplay = "se încarcă...";
    }


    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5" /> {t.pageTitle}</CardTitle>
                    <CardDescription>{t.pageDescription} ({t.generalPlatformInfoFor} {farmerName}, {contextDisplay})</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center"><Phone className="mr-2 h-5 w-5 text-primary" /> {t.contactCardTitle}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{t.contactYourMayorInfo}</p>
                        <div>
                            <h4 className="font-medium text-sm">{t.platformSupportLabel}</h4>
                            <p className="text-sm text-muted-foreground">{t.contactAdminForTechnical}</p>
                            <a href={`mailto:${t.emailPlatformSupport}`} className="text-sm font-semibold text-primary hover:underline break-all">
                                <Mail className="inline-block mr-1.5 h-4 w-4" />{t.emailPlatformSupport}
                            </a>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary" /> {t.feedbackCardTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{t.feedbackDescription}</p>
                        <Button asChild className="w-full">
                            <a href={`mailto:${t.emailPlatformSupport}?subject=Feedback Platforma AgriCad (Agricultor)`}>Trimite un email</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Info className="mr-2 h-5 w-5 text-primary" /> {t.faqCardTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold">{t.faq1Question}</h4>
                        <p className="text-sm text-muted-foreground">{t.faq1Answer}</p>
                    </div>
                    <Separator />
                    <div>
                        <h4 className="font-semibold">{t.faq2Question}</h4>
                        <p className="text-sm text-muted-foreground">{t.faq2Answer}</p>
                    </div>
                    <Separator />
                    <div>
                        <h4 className="font-semibold">{t.faq3Question}</h4>
                        <p className="text-sm text-muted-foreground">{t.faq3Answer}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}