// src/app/admin/farmers/page.tsx
import type { Metadata } from 'next';
// REMOVE: import dynamic from 'next/dynamic'; // No longer needed here
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

// REMOVE: import { FarmerTableSkeleton } from './loading'; // No longer needed directly here for dynamic loading
// REMOVE: const DynamicFarmerTable = ... // This entire block moves to the Client Wrapper

// IMPORT the new Client Component wrapper
import { ClientFarmerTableWrapper } from './components/client-farmer-table-wrapper'; // Adjust path if necessary

export const metadata: Metadata = {
  title: 'Gestionare Fermieri',
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
          {/* Render the new Client Component wrapper */}
          <ClientFarmerTableWrapper readOnly={true} actorRole="admin" />
        </CardContent>
      </Card>
    </div>
  );
}