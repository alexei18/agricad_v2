// src/app/admin/mayors/loading.tsx
'use client'; // <--- ADD THIS LINE AT THE VERY TOP

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

// Generic Table Skeleton
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

function MayorTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center py-4">
        <Skeleton className="h-10 w-full max-w-sm" /> {/* Filter skeleton */}
        <Skeleton className="h-10 w-24 ml-auto" /> {/* Add button skeleton */}
      </div>
      <div className="rounded-md border">
        <TableSkeleton rows={5} cells={7} /> {/* Using generic table skeleton */}
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Skeleton className="h-5 w-28 flex-1" /> {/* Selected rows text skeleton */}
        <Skeleton className="h-10 w-24" /> {/* Previous button skeleton */}
        <Skeleton className="h-10 w-16" /> {/* Page number skeleton */}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> <Skeleton className="h-6 w-40" /></CardTitle>
            <Skeleton className="h-4 w-72 mt-1" />
          </div>
          <Skeleton className="h-9 w-28" /> {/* Action button skeleton */}
        </CardHeader>
        <CardContent>
          <MayorTableSkeleton /> {/* Mayor table skeleton */}
        </CardContent>
      </Card>
    </div>
  );
}
