'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import AccountForm from './account-form'; // Componenta unde ai mutat logica
import Loading from './loading'; // Folosește componenta ta de loading

export default function FarmerAccountPage() {
    // Această structură este necesară pentru a repara eroarea de build
    return (
        <Suspense fallback={<Loading />}>
            <AccountForm />
        </Suspense>
    );
}