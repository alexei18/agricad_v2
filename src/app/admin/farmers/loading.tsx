// src/app/admin/farmers/loading.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

// Generic Table Skeleton - Exported to be used by DynamicFarmerTable in page.tsx
export function TableSkeleton({ rows = 5, cells = 7 }) {
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

// FarmerTable Skeleton - Exported to be used by DynamicFarmerTable in page.tsx
export function FarmerTableSkeleton({ readOnly = false }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center py-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="ml-auto flex items-center gap-2">
          {/* Only show add button skeleton if not readOnly */}
          {!readOnly && <Skeleton className="h-10 w-24" />}
        </div>
      </div>
      <div className="rounded-md border">
        {/* Adjust cell count based on readOnly (admin view has fewer interactive columns) */}
        <TableSkeleton rows={5} cells={readOnly ? 6 : 7} />
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        {/* Text for selected rows is not relevant for readOnly view */}
        {!readOnly && <Skeleton className="h-5 w-28 flex-1" />}
        {readOnly && <div className="flex-1"></div>} {/* Spacer */}
        <Skeleton className="h-10 w-24" /> {/* Previous button */}
        <Skeleton className="h-10 w-16" /> {/* Page number (simulated) */}
        <Skeleton className="h-10 w-16" /> {/* Next button */}
      </div>
    </div>
  );
}

// Default export for the route's loading.tsx file
// This is what Next.js will render when the /admin/farmers route is loading
export default function Loading() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> <Skeleton className="h-6 w-32" /></CardTitle>
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Use the exported FarmerTableSkeleton here */}
          <FarmerTableSkeleton readOnly={true} />
        </CardContent>
      </Card>
    </div>
  );
}