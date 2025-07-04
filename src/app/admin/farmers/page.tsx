// src/app/admin/farmers/page.tsx
import type { Metadata } from 'next';
import dynamic from 'next/dynamic'; // Import dynamic for client-side loading
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

// Import the skeleton components from loading.tsx
import { FarmerTableSkeleton } from './loading';

// Define the FarmerTable as a dynamic import with ssr: false
// This ensures it's only rendered on the client, avoiding server-side issues with browser-specific APIs.
const DynamicFarmerTable = dynamic(() => import('./components/farmer-table').then(mod => mod.FarmerTable), {
  ssr: false, // CRUCIAL: Do NOT render this component on the server
  loading: () => <FarmerTableSkeleton readOnly={true} />, // Show this while the client component loads
});

export const metadata: Metadata = {
  title: 'Gestionare Fermieri', // Metadata for SEO and browser tab title
  description: 'Vizualizați și gestionați conturile agricultorilor în cadrul platformei AgriCad.'
};

export default function AdminFarmersPage() {
  const t = {
    cardTitle: "Vizualizare agricultori",
    cardDescription: "Răsfoiți conturile agricultorilor din toate satele. Utilizați filtrele din tabel pentru a restrânge rezultatele."
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {t.cardTitle}</CardTitle>
            <CardDescription>
              {t.cardDescription}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Render the dynamically loaded FarmerTable */}
          <DynamicFarmerTable readOnly={true} actorRole="admin" />
        </CardContent>
      </Card>
    </div>
  );
}