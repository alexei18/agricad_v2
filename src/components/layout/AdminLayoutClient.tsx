// src/components/layout/AdminLayoutClient.tsx
'use client'; // Aceasta este o Componentă Client!

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
// ... alte importuri (ex: pentru Sidebar, Header etc.)

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Folosește router, pathname, searchParams aici în logica ta de UI
    // De exemplu, pentru a evidenția link-ul activ din sidebar sau pentru redirecționări

    return (
        <div className="flex min-h-screen">
            {/* Aici ar veni componenta ta de sidebar (client-side) */}
            {/* <AdminSidebar /> */}
                {children}
        </div>
    );
}