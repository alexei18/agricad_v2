// src/app/admin/logs/page.tsx
// NO 'use client' directive here - it must be a Server Component

import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

// IMPORTANT: For this test, we are completely removing the import of LogTableSkeleton
// from './loading' and replacing it with a simple string or basic HTML element.
// This rules out *any* possible implicit client-side behavior from the skeleton.
const DynamicClientLogsViewer = dynamic(() => import('./components/client-logs-viewer').then(mod => mod.ClientLogsViewer), {
    ssr: false,
    loading: () => <p>Loading logs content...</p>, // Using a simple p tag for absolute certainty
});

export const metadata: Metadata = {
    title: 'Jurnale sistem',
    description: 'Vizualizați evenimentele de sistem înregistrate, inclusiv atribuirile de parcele și acțiunile utilizatorilor.'
};

export default function AdminLogsPage() {
    return (
        <main>
            <h1>Admin Logs (Server Component)</h1>
            <p>This is a test page to isolate the dynamic import issue.</p>
            {/* The problematic dynamic import */}
            <DynamicClientLogsViewer />
        </main>
    );
}