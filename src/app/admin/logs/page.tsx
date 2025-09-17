// src/app/admin/logs/page.tsx
'use client';

export const dynamic = 'force-dynamic';

// Import the new Client Component wrapper
import { DynamicLogsLoader } from './components/dynamic-logs-loader'; // Adjust path if necessary

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