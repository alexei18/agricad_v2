// src/app/mayor/layout.tsx
// Fără 'use client'; => Acesta este un Server Component

import { Suspense } from 'react';
import { MayorLayoutClient } from '@/components/layout/MayorLayoutClient'; // Presupunând că ai un MayorLayoutClient
import { Loader2} from 'lucide-react';

// Poți adăuga și generateMetadata aici dacă dorești metadate comune pentru toate paginile de primar
// import { Metadata } from 'next';
// export const metadata: Metadata = {
//   title: 'AgriCad Primar',
//   description: 'Panou de administrare pentru primari',
// };

export default function MayorRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                {/* Folosește Loader2 sau alt fallback vizual */}
                {/* Asigură-te că Loader2 este importat: import { Loader2 } from 'lucide-react'; */}
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Se încarcă secțiunea primar...</span>
            </div>
        }>
            <MayorLayoutClient> {/* Sau componenta ta de layout client-side pentru primar */}
                {children}
            </MayorLayoutClient>
        </Suspense>
    );
}