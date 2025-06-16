// src/app/farmer/dashboard/layout.tsx
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { FarmerLayoutClient } from '@/components/layout/FarmerLayoutClient'; // Import
import { unstable_noStore as noStore } from 'next/cache';

const PAGE_SPECIFIC_NAME = "Panou Agricultor";

export async function generateMetadata(): Promise<Metadata> {
    noStore();
    let pageTitle = `AgriCad - ${PAGE_SPECIFIC_NAME}`;
    let pageDescription = `${PAGE_SPECIFIC_NAME} - Platforma agricolă`;

    const session = await getServerSession(authOptions);
    // Extindem tipul pentru user-ul din sesiune
    type SessionUser = { id?: string; name?: string | null; email?: string | null; village?: string }; // village este satul principal
    const typedUser = session?.user as SessionUser | undefined;

    const farmerName = typedUser?.name;
    const farmerVillage = typedUser?.village; // Satul principal de înregistrare

    if (farmerName && farmerVillage) {
        pageTitle = `AgriCad - ${farmerName} (${farmerVillage}) - ${PAGE_SPECIFIC_NAME}`;
        pageDescription = `${PAGE_SPECIFIC_NAME} pentru agricultorul ${farmerName} din ${farmerVillage}`;
    } else if (farmerName) {
        pageTitle = `AgriCad - ${farmerName} - ${PAGE_SPECIFIC_NAME}`;
        pageDescription = `${PAGE_SPECIFIC_NAME} pentru agricultorul ${farmerName}`;
    }

    return {
        title: pageTitle,
        description: pageDescription,
    };
}

export default function FarmerDashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <FarmerLayoutClient>
            {children}
        </FarmerLayoutClient>
    );
}