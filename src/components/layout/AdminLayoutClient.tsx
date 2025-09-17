// src/components/layout/AdminLayoutClient.tsx
'use client'; // Aceasta este o Componentă Client!

import { useRouter, usePathname } from 'next/navigation';
import { Suspense } from 'react';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    // Removed useSearchParams for now to fix build issue

    return (
        <div className="flex min-h-screen">
            {/* Aici ar veni componenta ta de sidebar (client-side) */}
            {/* <AdminSidebar /> */}
            {children}
        </div>
    );
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </Suspense>
    );
}