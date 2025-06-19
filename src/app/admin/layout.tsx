// src/app/admin/layout.tsx
// Acesta este un Server Component - NU adăugați 'use client'; aici!

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react'; // Asigură-te că ai instalat lucide-react (npm install lucide-react)
// Importă componenta ta de layout client-side pentru admin.
// Adaptează calea și numele componentei dacă sunt diferite în proiectul tău.
import { AdminLayoutClient } from '@/components/layout/AdminLayoutClient'; // Asigură-te că ai creat această componentă
import type { Metadata } from "next";
import { unstable_noStore as noStore } from 'next/cache'; // Pentru a dezactiva cache-ul pentru metadata dacă este necesar

// Metadate specifice pentru secțiunea de administrare
export const metadata: Metadata = {
    title: 'AgriCad - Panou de Administrare',
    description: 'Panoul de administrare al platformei AgriCad.',
};

export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // `noStore()` este folosit aici pentru a asigura că metadatele sunt generate dinamic la fiecare cerere.
    // Poți decide dacă ai nevoie de el sau nu, în funcție de cerințele de caching.
    noStore();

    return (
        // Înfășurăm AdminLayoutClient într-un Suspense Boundary.
        // Acest lucru permite Server Component-ului să randeze rapid un fallback
        // (în cazul nostru, un loader) în timp ce componenta client-side cu hook-uri
        // precum useSearchParams se hidratează pe client.
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="ml-4 text-lg text-gray-700">Se încarcă panoul de administrare...</p>
            </div>
        }>
            <AdminLayoutClient>
                {children}
            </AdminLayoutClient>
        </Suspense>
    );
}