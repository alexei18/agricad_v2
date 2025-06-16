// src/app/mayor/dashboard/layout.tsx
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { MayorLayoutClient } from '@/components/layout/MayorLayoutClient'; // Import
import { unstable_noStore as noStore } from 'next/cache';

const PAGE_SPECIFIC_NAME = "Panou Principal";

export async function generateMetadata(): Promise<Metadata> {
    noStore();
    let pageTitle = `AgriCad - ${PAGE_SPECIFIC_NAME} Primar`;
    let pageDescription = `${PAGE_SPECIFIC_NAME} - Panou de control pentru primar`;

    const session = await getServerSession(authOptions);
    // Extindem tipul pentru user-ul din sesiune pentru a include câmpurile personalizate
    type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; villages?: string[] };
    const typedUser = session?.user as SessionUser | undefined;

    const mayorName = typedUser?.name;
    const mayorManagedVillages = typedUser?.villages;

    let villageDisplayInfo = "";
    if (mayorManagedVillages && mayorManagedVillages.length > 0) {
        const firstVillage = mayorManagedVillages[0];
        const additionalVillagesCount = mayorManagedVillages.length - 1;
        villageDisplayInfo = firstVillage;
        if (additionalVillagesCount > 0) {
            villageDisplayInfo += ` (+${additionalVillagesCount} ${additionalVillagesCount === 1 ? 'alt sat' : 'alte sate'})`;
        }
    }

    if (mayorName && villageDisplayInfo) {
        pageTitle = `AgriCad - ${mayorName} (${villageDisplayInfo}) - ${PAGE_SPECIFIC_NAME}`;
        pageDescription = `${PAGE_SPECIFIC_NAME} pentru primarul ${mayorName}, sate: ${villageDisplayInfo}`;
    } else if (mayorName) {
        pageTitle = `AgriCad - ${mayorName} - ${PAGE_SPECIFIC_NAME}`;
        pageDescription = `${PAGE_SPECIFIC_NAME} pentru primarul ${mayorName}`;
    }

    return {
        title: pageTitle,
        description: pageDescription,
    };
}

export default function MayorDashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <MayorLayoutClient> {/* Înfășurăm copiii cu provider-ul de context */}
            {children}
        </MayorLayoutClient>
    );
}