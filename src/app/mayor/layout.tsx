// src/app/mayor/layout.tsx
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { MayorLayoutClient } from '@/components/layout/MayorLayoutClient'; // Assuming you have a MayorLayoutClient
import { unstable_noStore as noStore } from 'next/cache';

type SessionUser = { name?: string | null; };

export async function generateMetadata(): Promise<Metadata> {
    noStore();
    const session = await getServerSession(authOptions);
    const typedUser = session?.user as SessionUser | undefined;
    const mayorName = typedUser?.name; // Adjust based on how you get the mayor's name
    const baseTitle = mayorName ? `AgriCad - ${mayorName}` : "AgriCad - Spațiu Primar";
    return {
        title: { template: `%s | ${baseTitle}`, default: baseTitle },
        description: `Platforma agricolă AgriCad pentru ${mayorName || 'primari'}.`,
    };
}

export default function MayorRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <MayorLayoutClient>
            {children}
        </MayorLayoutClient>
    );
}