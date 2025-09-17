'use client';

export const dynamic = 'force-dynamic';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParcelUploadForm } from './components/parcel-upload-form';
import { Upload } from 'lucide-react';

export default function AdminParcelsPage() {
  const t = {
    title: "Încărcare date parcele",
    description: "Încărcați datele cadastrale de bază prin CSV. Fișierul trebuie să includă coloanele: `parcel_id` (text), `area_hectares` (număr), `projected_polygon` (text de forma \"POLYGON((X Y, ...))\" folosind sistemul local de proiecție) și `village` (text). Sistemul va transforma coordonatele `projected_polygon` în WGS84 (latitudine, longitudine) pentru afișare. Parcelele existente cu același `parcel_id` vor fi actualizate. Atribuirile Proprietar/Arendator/cultivator sunt gestionate de primari."
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> {t.title}</CardTitle>
          <CardDescription>
            {t.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ParcelUploadForm />
        </CardContent>
      </Card>
    </div>
  );
}