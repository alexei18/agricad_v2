// src/app/farmer/stats/layout.tsx
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { FarmerLayoutClient } from '@/components/layout/FarmerLayoutClient'; // Import
import { unstable_noStore as noStore } from 'next/cache';

const PAGE_SPECIFIC_NAME = "Statistici Agricole"; // Nume specific pentru această pagină

// Tip pentru user-ul din sesiune
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; village?: string };

export async function generateMetadata(): Promise<Metadata> {
  noStore();
  let pageTitle = `AgriCad - ${PAGE_SPECIFIC_NAME}`;
  let pageDescription = `${PAGE_SPECIFIC_NAME} - Platforma agricolă`;

  const session = await getServerSession(authOptions);
  const typedUser = session?.user as SessionUser | undefined;

  const farmerName = typedUser?.name;
  // Pentru statistici, titlul general e suficient, contextul exact al satului e gestionat pe client
  if (farmerName) {
    pageTitle = `AgriCad - ${farmerName} - ${PAGE_SPECIFIC_NAME}`;
    pageDescription = `${PAGE_SPECIFIC_NAME} pentru agricultorul ${farmerName}`;
  }

  return {
    title: pageTitle,
    description: pageDescription,
  };
}

export default function FarmerStatsLayout({
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