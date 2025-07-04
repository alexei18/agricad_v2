// src/app/admin/logs/components/client-logs-viewer.tsx
'use client'; // This makes it a Client Component

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAssignmentLogs, getUserActionLogs, LogEntry } from '@/services/logs';

// You will likely need to export LogTableSkeleton from loading.tsx
// Or define it here if it's only for this component.
// For simplicity, let's assume it's exported from loading.tsx
// import { LogTableSkeleton } from '../loading'; // Only needed if you want to use it directly, but dynamic takes care of loading

type LogType = 'assignment' | 'userAction';

// Re-defining the text object here for clarity, or you can pass it as props
const t = {
    title: "Jurnale sistem",
    description: "Vizualizați evenimentele de sistem înregistrate, inclusiv atribuirile de parcele și acțiunile utilizatorilor.",
    assignmentLogsTab: "Jurnale atribuiri parcele",
    userActionLogsTab: "Jurnale acțiuni utilizatori",
    timestampHeader: "Dată/Oră",
    userActorHeader: "Utilizator/Actor",
    actionHeader: "Acțiune",
    detailsHeader: "Detalii",
    noLogs: "Nu s-au găsit înregistrări în jurnal pentru această categorie.",
    errorLoadingTitle: "Eroare la încărcarea jurnalelor",
    errorLoadingAssignments: "Nu s-au putut încărca jurnalele de atribuiri.",
    errorLoadingUserActions: "Nu s-au putut încărca jurnalele de acțiuni ale utilizatorilor."
};

export function ClientLogsViewer() { // Export this function
    const [assignmentLogs, setAssignmentLogs] = React.useState<LogEntry[]>([]);
    const [userActionLogs, setUserActionLogs] = React.useState<LogEntry[]>([]);
    const [loadingAssignments, setLoadingAssignments] = React.useState(true);
    const [loadingUserActions, setLoadingUserActions] = React.useState(true);
    const [errorAssignments, setErrorAssignments] = React.useState<string | null>(null);
    const [errorUserActions, setErrorUserActions] = React.useState<string | null>(null);

    const fetchLogs = React.useCallback(async (logType: LogType) => {
        if (logType === 'assignment') {
            setLoadingAssignments(true);
            setErrorAssignments(null);
            try {
                const logs = await getAssignmentLogs();
                setAssignmentLogs(logs);
            } catch (err) {
                console.error("Error fetching assignment logs:", err);
                setErrorAssignments(err instanceof Error ? err.message : t.errorLoadingAssignments);
                setAssignmentLogs([]);
            } finally {
                setLoadingAssignments(false);
            }
        } else if (logType === 'userAction') {
            setLoadingUserActions(true);
            setErrorUserActions(null);
            try {
                const logs = await getUserActionLogs();
                setUserActionLogs(logs);
            } catch (err) {
                console.error("Error fetching user action logs:", err);
                setErrorUserActions(err instanceof Error ? err.message : t.errorLoadingUserActions);
                setUserActionLogs([]);
            } finally {
                setLoadingUserActions(false);
            }
        }
    }, [t.errorLoadingAssignments, t.errorLoadingUserActions]);

    React.useEffect(() => {
        fetchLogs('assignment');
        fetchLogs('userAction');
    }, [fetchLogs]);

    const renderLoadingSkeleton = () => (
        <div className="space-y-3 p-4">
            <div className="rounded-md border">
                <div className="divide-y divide-border">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 animate-pulse gap-2">
                            <div className="flex items-center space-x-4 w-full sm:w-auto">
                                <Skeleton className="h-4 w-28" />
                            </div>
                            <Skeleton className="h-4 w-full sm:w-40" />
                            <Skeleton className="h-4 w-full sm:w-48" />
                            <Skeleton className="h-4 w-full sm:w-32" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderError = (errorMsg: string | null) => (
        <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.errorLoadingTitle}</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
    );

    const renderLogTable = (logs: LogEntry[], isLoading: boolean, error: string | null) => {
        if (isLoading) return renderLoadingSkeleton();
        if (error) return renderError(error);
        if (logs.length === 0) {
            return <div className="p-6 text-center text-muted-foreground">{t.noLogs}</div>;
        }

        return (
            <ScrollArea className="h-[60vh] rounded-md border">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead className="w-[180px] whitespace-nowrap">{t.timestampHeader}</TableHead>
                            <TableHead className="whitespace-nowrap">{t.userActorHeader}</TableHead>
                            <TableHead className="whitespace-nowrap">{t.actionHeader}</TableHead>
                            <TableHead>{t.detailsHeader}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="text-xs">{new Date(log.timestamp).toLocaleString('ro-RO')}</TableCell>
                                <TableCell>{log.actor || 'Sistem'}</TableCell>
                                <TableCell>{log.action}</TableCell>
                                <TableCell className="text-xs break-words">{log.details || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    }

    return (
        <Tabs defaultValue="assignment">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
                <TabsTrigger value="assignment">{t.assignmentLogsTab}</TabsTrigger>
                <TabsTrigger value="userAction">{t.userActionLogsTab}</TabsTrigger>
            </TabsList>
            <TabsContent value="assignment" className="mt-4">
                {renderLogTable(assignmentLogs, loadingAssignments, errorAssignments)}
            </TabsContent>
            <TabsContent value="userAction" className="mt-4">
                {renderLogTable(userActionLogs, loadingUserActions, errorUserActions)}
            </TabsContent>
        </Tabs>
    );
}

// Ensure LogTableSkeleton is available for the dynamic import's loading fallback.
// If it's already in loading.tsx and exported, you don't need it here.
// Otherwise, include it directly:
// export function LogTableSkeleton() {
//   return (
//     <div className="space-y-3 p-4">
//       <div className="rounded-md border">
//         <div className="divide-y divide-border">
//           {[...Array(8)].map((_, i) => (
//             <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 animate-pulse gap-2">
//               <div className="flex items-center space-x-4 w-full sm:w-auto">
//                 <Skeleton className="h-4 w-28" />
//               </div>
//               <Skeleton className="h-4 w-full sm:w-40" />
//               <Skeleton className="h-4 w-full sm:w-48" />
//               <Skeleton className="h-4 w-full sm:w-32" />
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }