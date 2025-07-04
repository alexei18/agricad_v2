// src/app/admin/parcels/loading.tsx
'use client'; // <--- ADD THIS LINE AT THE VERY TOP

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload } from 'lucide-react';
// Note: You are importing Tabs components here, implying client-side interaction
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// The renderLoadingSkeleton function is now part of this client component's scope
const renderLoadingSkeleton = () => (
  <div className="space-y-3 p-4">
    <div className="flex justify-between">
      <Skeleton className="h-8 w-40" /> {/* Filter skeleton */}
    </div>
    <div className="rounded-md border">
      <div className="divide-y divide-border">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-24" /> {/* Timestamp */}
            </div>
            <Skeleton className="h-4 w-40 hidden sm:block" /> {/* User */}
            <Skeleton className="h-4 w-48 hidden md:block" /> {/* Action */}
            <Skeleton className="h-4 w-16 hidden lg:block" /> {/* Details */}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// This is the default export for the page's overall loading state
export default function Loading() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> <Skeleton className="h-6 w-48" /></CardTitle>
          <div className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* The Tabs component is interactive and requires client-side JS */}
          <Tabs defaultValue="upload-form-skeleton"> {/* Changed default value for clarity */}
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload-form-skeleton" disabled><Skeleton className="h-5 w-36" /></TabsTrigger>
              <TabsTrigger value="other-tab-skeleton" disabled><Skeleton className="h-5 w-32" /></TabsTrigger>
            </TabsList>
            <TabsContent value="upload-form-skeleton" className="mt-4">
              {renderLoadingSkeleton()}
            </TabsContent>
            <TabsContent value="other-tab-skeleton" className="mt-4">
              {renderLoadingSkeleton()} {/* Reusing for another tab's skeleton */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}