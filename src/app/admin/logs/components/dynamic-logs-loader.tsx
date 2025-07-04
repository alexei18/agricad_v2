// src/app/admin/logs/components/dynamic-logs-loader.tsx
'use client'; // This component MUST be a Client Component

import nextDynamic from 'next/dynamic'; // Use nextDynamic to avoid conflict if you keep `export const dynamic` in page.tsx

// Assuming LogTableSkeleton exists and is imported correctly
import { LogTableSkeleton } from '../loading'; // Adjust path if necessary

// Dynamically import the actual ClientLogsViewer within this client component
const DynamicClientLogsViewer = nextDynamic(() => import('./client-logs-viewer').then(mod => mod.ClientLogsViewer), {
    ssr: false, // This is now perfectly valid because this file is a Client Component
    loading: () => <LogTableSkeleton />, // Use your actual skeleton here, or <p>Loading...</p>
});

export function DynamicLogsLoader() {
    return <DynamicClientLogsViewer />;
}