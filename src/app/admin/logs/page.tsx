// src/app/admin/logs/page.tsx
import type { Metadata } from 'next';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // <--- COMMENT OUT
import { History } from 'lucide-react';
import dynamic from 'next/dynamic';

import { LogTableSkeleton } from './loading';

const DynamicClientLogsViewer = dynamic(() => import('./components/client-logs-viewer').then(mod => mod.ClientLogsViewer), {
    ssr: false,
    loading: () => <LogTableSkeleton />,
});

export const metadata: Metadata = {
    title: 'Jurnale sistem',
    description: 'Vizualizați evenimentele de sistem înregistrate, inclusiv atribuirile de parcele și acțiunile utilizatorilor.'
};

export default function AdminLogsPage() {
    const t = {
        title: "Jurnale sistem",
        description: "Vizualizați evenimentele de sistem înregistrate, inclusiv atribuirile de parcele și acțiunile utilizatorilor."
    };

    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            {/* Replace with basic divs for testing */}
            <div>
                <div>
                    <History className="h-5 w-5" />
                    {t.title}
                </div>
                <div>
                    {t.description}
                </div>
            </div>
            <div>
                <DynamicClientLogsViewer />
            </div>
        </div>
    );
}