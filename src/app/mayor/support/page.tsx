// src/app/mayor/support/page.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, HelpCircle, MessageSquare, Info } from 'lucide-react';
import { useSession } from 'next-auth/react'; // Doar pentru nume, dacă e nevoie
import { useMayorVillageContext } from '@/components/layout/MayorLayoutClient'; // Pentru context sat, dacă e nevoie
import { Button } from '@/components/ui/button'; // Import adăugat
import { Separator } from '@/components/ui/separator';

const t = {
  pageTitle: "Suport tehnic și Asistență",
  pageDescription: "Aveți întrebări sau aveți nevoie de ajutor? Contactați-ne.",
  contactCardTitle: "Informații de contact",
  faqCardTitle: "Întrebări frecvente",
  faq1Question: "Cum adaug un nou agricultor în sistem?",
  faq1Answer: "Din meniul 'Gestionare agricultori', apăsați butonul 'Adaugă agricultor' și completați formularul. Asigurați-vă că aveți codul fiscal și satul de înregistrare corecte.",
  faq2Question: "Cum atribui parcele unui agricultor?",
  faq2Answer: "În secțiunea 'Gestionare parcele', selectați agricultorul dorit din lista derulantă, apoi bifați parcelele pe care doriți să le atribuiți ca 'Deținute' sau 'Cultivate' și apăsați 'Atribuie parcele'.",
  faq3Question: "Ce fac dacă am uitat parola?",
  faq3Answer: "Dacă sunteți primar, contactați administratorul platformei pentru resetarea parolei. Dacă sunteți agricultor, contactați primăria dvs.",
  feedbackCardTitle: "Feedback și Sugestii",
  feedbackDescription: "Opinia dvs. este importantă! Trimiteți-ne sugestii pentru a îmbunătăți platforma.",
  emailSupport: "agricad.md@gmail.com", // Email exemplu
  phoneSupport: "+373 68 512 814", // Telefon exemplu
  generalPlatformInfoFor: "Informații generale pentru",
  notAvailable: "Nespecificat"
};

export default function MayorSupportPage() {
  const { data: session } = useSession();
  const { selectedVillage, managedVillages } = useMayorVillageContext();

  const mayorName = session?.user?.name || t.notAvailable;
  let contextDisplay = t.notAvailable;
  if (selectedVillage) {
    contextDisplay = `satul ${selectedVillage}`;
  } else if (managedVillages.length > 0) {
    contextDisplay = `${managedVillages.length} ${managedVillages.length === 1 ? 'sat gestionat' : 'sate gestionate'}`;
  }


  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5" /> {t.pageTitle}</CardTitle>
          <CardDescription>{t.pageDescription} ({t.generalPlatformInfoFor} {mayorName}, {contextDisplay})</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><Mail className="mr-2 h-5 w-5 text-primary" /> Contactați-ne prin Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Pentru probleme tehnice, întrebări generale sau feedback:</p>
            <a href={`mailto:${t.emailSupport}`} className="text-base font-semibold text-primary hover:underline break-all">
              {t.emailSupport}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><Phone className="mr-2 h-5 w-5 text-primary" /> Suport telefonic</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Pentru asistență urgentă, ne puteți contacta la:</p>
            <p className="text-base font-semibold">{t.phoneSupport}</p>
            <p className="text-xs text-muted-foreground">(Luni - Vineri, 09:00 - 17:00)</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary" /> Trimiteți feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{t.feedbackDescription}</p>
            <Button asChild className="w-full">
              <a href={`mailto:${t.emailSupport}?subject=Feedback/Sugestie Platforma AgriCad`}>Trimite un email</a>
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