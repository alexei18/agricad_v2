// src/app/farmer/layout.tsx
// Acest fișier este un Server Component (fără 'use client;')
import { Suspense } from 'react'; // Importă Suspense
import { FarmerLayoutClient } from '@/components/layout/FarmerLayoutClient'; // Importă componenta ta de layout client
import { Loader2 } from 'lucide-react';
// Poți adăuga și generateMetadata aici dacă dorești metadate comune pentru toate paginile de fermier
// import { Metadata } from 'next';
// export const metadata: Metadata = {
//   title: 'AgriCad Fermier',
//   description: 'Platforma de management agricol pentru fermieri',
// };

export default function FarmerRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // Înfășoară FarmerLayoutClient în Suspense pentru a gestiona CSR Bailout-ul
        // Fallback-ul va fi afișat în timpul prerendering-ului sau în timpul încărcării inițiale
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                {/* Poți folosi un loader mai elaborat aici, dacă vrei */}
                <Loader2 className="h-8 w-8 animate-spin" /> {/* Asigură-te că Loader2 este importat */}
                <span className="ml-2">Se încarcă secțiunea agricultor...</span>
            </div>
        }>
            <FarmerLayoutClient>
                {children}
            </FarmerLayoutClient>
        </Suspense>
    );
}