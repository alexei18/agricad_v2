import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { FarmerLayoutClient } from '@/components/layout/FarmerLayoutClient';
import { unstable_noStore as noStore } from 'next/cache';

type SessionUser = { name?: string | null; };

export async function generateMetadata(): Promise<Metadata> {
    noStore();
    const session = await getServerSession(authOptions);
    const typedUser = session?.user as SessionUser | undefined;
    const farmerName = typedUser?.name;
    const baseTitle = farmerName ? `AgriCad - ${farmerName}` : "AgriCad - Spațiu Agricultor";
    return {
        title: { template: `%s | ${baseTitle}`, default: baseTitle },
        description: `Platforma agricolă AgriCad pentru ${farmerName || 'agricultori'}.`,
    };
}

export default function FarmerRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <FarmerLayoutClient>
            {children}
        </FarmerLayoutClient>
    );
}