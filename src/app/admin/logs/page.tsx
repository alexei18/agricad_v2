// src/app/admin/logs/page.tsx
// NO 'use client' directive here

// Rename the import to avoid conflict with the export const dynamic
import nextDynamic from 'next/dynamic'; // <-- CHANGED THIS LINE

import type { Metadata } from 'next';

// Force this page to always be rendered dynamically on the server
// This bypasses static generation issues that might conflict with ssr: false
export const dynamic = 'force-dynamic'; // This is correct as a string

const DynamicClientLogsViewer = nextDynamic(() => import('./components/client-logs-viewer').then(mod => mod.ClientLogsViewer), {
    ssr: false,
    loading: () => <p>Loading logs content...</p>,
});

export const metadata: Metadata = {
    title: 'Jurnale sistem',
    description: 'Vizualizați evenimentele de sistem înregistrate, inclusiv atribuirile de parcele și acțiunile utilizatorilor.'
};

export default function AdminLogsPage() {
    return (
        <main>
            <h1>Admin Logs (Server Component - Force Dynamic)</h1>
            <p>This is a test page with dynamic rendering enabled.</p>
            <DynamicClientLogsViewer />
        </main>
    );
}