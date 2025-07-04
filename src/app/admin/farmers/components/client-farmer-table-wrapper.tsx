// src/app/admin/farmers/components/client-farmer-table-wrapper.tsx
'use client'; // This directive is CRUCIAL to make this a Client Component

import dynamic from 'next/dynamic';
import { FarmerTableSkeleton } from '../loading'; // Adjust path if necessary

// Define the FarmerTable as a dynamic import with ssr: false
const DynamicFarmerTable = dynamic(() => import('./farmer-table').then(mod => mod.FarmerTable), {
    ssr: false, // This is now allowed because this file is a Client Component
    loading: () => <FarmerTableSkeleton readOnly={true} />,
});

// Define the props for this wrapper component
interface ClientFarmerTableWrapperProps {
    actorRole: 'admin' | 'mayor';
    // Add any other props that FarmerTable might need from the Server Component
    // For now, based on your page.tsx, it's just actorRole and readOnly
    readOnly?: boolean;
}

export function ClientFarmerTableWrapper({ actorRole, readOnly }: ClientFarmerTableWrapperProps) {
    return (
        // Render the dynamically loaded FarmerTable
        <DynamicFarmerTable actorRole={actorRole} readOnly={readOnly} />
    );
}