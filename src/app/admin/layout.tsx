// src/app/admin/layout.tsx
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AdminLayoutClient } from '@/components/layout/AdminLayoutClient'; // Assuming you have an AdminLayoutClient
import { unstable_noStore as noStore } from 'next/cache';

type SessionUser = { name?: string | null; };

export async function generateMetadata(): Promise<Metadata> {
    noStore();
    const session = await getServerSession(authOptions);
    const typedUser = session?.user as SessionUser | undefined;
    const adminName = typedUser?.name; // Adjust based on how you get the admin's name
    const baseTitle = adminName ? `AgriCad - ${adminName}` : "AgriCad - Spațiu Administrator";
    return {
        title: { template: `%s | ${baseTitle}`, default: baseTitle },
        description: `Platforma agricolă AgriCad pentru ${adminName || 'administratori'}.`,
    };
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminLayoutClient>
            {children}
        </AdminLayoutClient>
    );
}