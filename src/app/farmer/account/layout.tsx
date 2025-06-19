// src/app/farmer/account/layout.tsx
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { FarmerLayoutClient } from '@/components/layout/FarmerLayoutClient';
import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react'; // <--- Importă Suspense aici
import { Loader2 } from 'lucide-react';

const PAGE_SPECIFIC_NAME = "Contul Meu";

type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; village?: string };

export async function generateMetadata(): Promise<Metadata> {
    noStore();
    let pageTitle = `AgriCad - ${PAGE_SPECIFIC_NAME}`;
    let pageDescription = `${PAGE_SPECIFIC_NAME} - Platforma agricolă`;

    const session = await getServerSession(authOptions);
    const typedUser = session?.user as SessionUser | undefined;

    const farmerName = typedUser?.name;

    if (farmerName) {
        pageTitle = `AgriCad - ${farmerName} - ${PAGE_SPECIFIC_NAME}`;
        pageDescription = `${PAGE_SPECIFIC_NAME} pentru agricultorul ${farmerName}`;
    }

    return {
        title: pageTitle,
        description: pageDescription,
    };
}

export default function FarmerAccountLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // <--- Adaugă Suspense aici
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" /> {/* Asigură-te că Loader2 este importat */}
                <span className="ml-2">Se încarcă layout-ul contului...</span>
            </div>
        }>
            <FarmerLayoutClient>
                {children}
            </FarmerLayoutClient>
        </Suspense>
    );
}