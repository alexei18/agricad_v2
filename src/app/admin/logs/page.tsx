// src/app/admin/logs/page.tsx
// NO 'use client' directive here

// No longer importing nextDynamic here directly
// import nextDynamic from 'next/dynamic'; // REMOVE THIS IMPORT

import type { Metadata } from 'next';

// Keep this to ensure the page is dynamically rendered, just in case
export const dynamic = 'force-dynamic';

// Import the new Client Component wrapper
import { DynamicLogsLoader } from './components/dynamic-logs-loader'; // Adjust path if necessary

export const metadata: Metadata = {
    title: 'Jurnale sistem',
    description: 'Vizualizați evenimentele de sistem înregistrate, inclusiv atribuirile de parcele și acțiunile utilizatorilor.'
};

export default function AdminLogsPage() {
    return (
        <main>
            <h1>Admin Logs (Server Component - Force Dynamic)</h1>
            <p>This page loads content via a client-side dynamic loader.</p>
            {/* Render the new client component wrapper */}
            <DynamicLogsLoader />
        </main>
    );
}