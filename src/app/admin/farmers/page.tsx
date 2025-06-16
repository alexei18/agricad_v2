import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FarmerTable } from './components/farmer-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

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
          <Suspense fallback={<FarmerTableSkeleton readOnly={true} />}>
            <FarmerTable readOnly={true} /> {/* `readOnly` este important pentru admin */}
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

function FarmerTableSkeleton({ readOnly = false }) { // `readOnly` este deja aici
  // Numărul de celule pentru admin (readOnly: true) ar trebui să fie mai mic,
  // deoarece nu avem coloana de selecție și nici coloana de acțiuni.
  // Presupunând coloane: Culoare, Nume, Cod Fiscal, Sat(e), Email, Telefon, Ultima Actualizare
  // Acest lucru înseamnă 7 coloane vizibile, dacă toate sunt afișate.
  // Dar în FarmerTable, unele sunt ascunse by default (email, phone, updatedAt, color).
  // Să calculăm pentru cele vizibile by default: Culoare (mică), Nume, Cod Fiscal, Sat. => 4
  // Dacă 'color' e foarte mică, putem zice 3 celule principale + una mică.
  // Scheletul nu trebuie să fie 100% exact, dar să dea o idee.
  // Să zicem că pentru readOnly, avem 6 coloane (fără select și fără acțiuni).
  const cellsCount = readOnly ? 6 : 8; // 8 dacă nu e readonly (select + 6 date + actions)

  return (
    <div className="space-y-3">
      <div className="flex items-center py-4">
        <Skeleton className="h-10 w-full max-w-sm" /> {/* Filtru */}
        <div className="ml-auto flex items-center gap-2">
          {/* Nu mai e buton de adăugare în Admin/ViewFarmers */}
          {/* Butonul de "Coloane" */}
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="rounded-md border">
        <TableSkeleton rows={5} cells={cellsCount} />
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        {/* Textul "x din y selectate" nu e relevant pentru readOnly */}
        {readOnly && <div className="flex-1"></div>}
        {!readOnly && <Skeleton className="h-5 w-28 flex-1" />}
        <Skeleton className="h-10 w-24" /> {/* Buton Anterior */}
        <Skeleton className="h-10 w-24" /> {/* Buton Următor */}
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5, cells = 7 }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {[...Array(cells)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(rows)].map((_, i) => (
          <TableRow key={i}>
            {[...Array(cells)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}