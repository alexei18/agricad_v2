// src/app/farmer/account/layout.tsx
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { FarmerLayoutClient } from '@/components/layout/FarmerLayoutClient'; // Import
import { unstable_noStore as noStore } from 'next/cache';

const PAGE_SPECIFIC_NAME = "Contul Meu";

// Tip pentru user-ul din sesiune (ideal, definit global în next-auth.d.ts)
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; village?: string };

export async function generateMetadata(): Promise<Metadata> {
    noStore(); // Asigură că metadata nu este stocată static dacă depinde de sesiune
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
        <FarmerLayoutClient> {/* Înfășurăm copiii cu provider-ul de context */}
            {children}
        </FarmerLayoutClient>
    );
}