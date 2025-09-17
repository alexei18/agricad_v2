// src/app/admin/farmers/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function AdminFarmersPage() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestionare Agricultori
          </CardTitle>
          <CardDescription>
            Funcționalitatea de gestionare agricultori va fi disponibilă în curând.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Pagina se încarcă...</p>
        </CardContent>
      </Card>
    </div>
  );
}