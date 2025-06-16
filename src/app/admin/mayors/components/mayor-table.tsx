// src/app/admin/mayors/components/mayor-table.tsx
'use client';

import * as React from 'react';
import {
  ColumnDef, ColumnFiltersState, SortingState, VisibilityState,
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Trash2, Edit, Power, PowerOff, ShieldCheck, ShieldAlert, HelpCircle, ChevronDown, Loader2, KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  type MayorWithManagedVillages,
  deleteMayor,
  updateMayorStatus,
  updateMayorDetails,
  type UpdateMayorDetailsData,
  resetMayorPasswordByAdmin,
  getAllMayors
} from '@/services/mayors';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  // AlertDialogTrigger, // Nu mai este necesar dacă folosim onSelect
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent as ShadDialogContent,
  DialogHeader as ShadDialogHeader, // <-- AICI ESTE CORECȚIA
  DialogTitle as ShadDialogTitle,
  DialogDescription as ShadDialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import type { Status } from '@prisma/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MayorTableMeta {
  // ... (la fel ca înainte)
  removeRow: (id: string) => void;
  updateRow: (id: string, data: Partial<MayorWithManagedVillages>) => void;
  refetchData: () => void;
  openEditDialog: (mayor: MayorWithManagedVillages) => void;
  openResetPasswordDialog: (mayor: MayorWithManagedVillages) => void;
  actorId: string;
}

const columns: ColumnDef<MayorWithManagedVillages>[] = [
  // ... (coloanele select, name, managedVillages, email rămân la fel)
  {
    id: 'select',
    header: ({ table }) => (<Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="Selectează tot" />),
    cell: ({ row }) => (<Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Selectează rând" />),
    enableSorting: false, enableHiding: false,
  },
  { accessorKey: 'name', header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Nume <ArrowUpDown className="ml-2 h-4 w-4" /></Button>), cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>, },
  {
    accessorKey: 'managedVillages', header: 'Sate gestionate',
    cell: ({ row }) => {
      const villages = row.original.managedVillages;
      if (!villages || villages.length === 0) return <span className="text-xs text-muted-foreground">Niciun sat</span>;
      if (villages.length > 2) {
        return (<TooltipProvider><Tooltip><TooltipTrigger asChild><Badge variant="outline" className="cursor-pointer">{villages.length} sate</Badge></TooltipTrigger><TooltipContent className="max-w-xs"><ul className="list-disc pl-4">{villages.map(v => <li key={v.id}>{v.name}</li>)}</ul></TooltipContent></Tooltip></TooltipProvider>);
      }
      return villages.map(v => v.name).join(', ');
    },
    enableSorting: false,
  },
  { accessorKey: 'email', header: 'Email', cell: ({ row }) => <div>{(row.getValue('email') as string) || '-'}</div>, },
  {
    accessorKey: 'subscriptionStatus', header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('subscriptionStatus') as Status;
      const variantMap: Record<Status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        ACTIVE: 'default', PENDING: 'secondary', INACTIVE: 'destructive'
      };
      const IconMap: Record<Status, React.ElementType> = {
        ACTIVE: ShieldCheck, PENDING: HelpCircle, INACTIVE: ShieldAlert
      };
      const SpecificIconComponent = IconMap[status] || HelpCircle;

      let badgeClass = "capitalize";
      if (status === 'ACTIVE') badgeClass += " bg-green-100 text-green-700 border-green-300 hover:bg-green-200";
      else if (status === 'INACTIVE') badgeClass += " bg-red-100 text-red-700 border-red-300 hover:bg-red-200";
      else if (status === 'PENDING') badgeClass += " bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200";

      return (<Badge variant={variantMap[status] || 'outline'} className={badgeClass}> <SpecificIconComponent className="mr-1 h-3 w-3" /> {status.toLowerCase()} </Badge>);
    },
    filterFn: (row, id, value: any) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'subscriptionEndDate', header: 'Sfârșit abonament',
    cell: ({ row }) => {
      const date = row.getValue('subscriptionEndDate') as Date | null;
      const status = row.getValue('subscriptionStatus');
      if (status === 'PENDING') return <span className="text-muted-foreground">N/A</span>;
      return date ? new Date(date).toLocaleDateString() : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'updatedAt', header: 'Ultima actualizare',
    cell: ({ row }) => { const date = row.getValue('updatedAt') as Date | null | undefined; return date ? new Date(date).toLocaleDateString() : 'N/A'; },
  },
  {
    id: 'actions', enableHiding: false,
    cell: ({ row, table }) => {
      const mayor = row.original;
      const { toast } = useToast();
      const [isDeleting, setIsDeleting] = React.useState(false);
      const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
      const meta = table.options.meta as MayorTableMeta;

      const handleDelete = async () => { /* ... implementare delete ... */
        setIsDeleting(true);
        try {
          const result = await deleteMayor(mayor.id, meta.actorId);
          if (result.success) {
            toast({ title: "Succes", description: `Contul de primar pentru '${mayor.name}' a fost șters.` });
            setIsDeleteDialogOpen(false);
            meta.refetchData();
          } else { throw new Error(result.error || "Nu s-a putut șterge primarul."); }
        } catch (error) {
          toast({ variant: "destructive", title: "Eroare", description: error instanceof Error ? error.message : "A apărut o eroare." });
        } finally { setIsDeleting(false); }
      };

      const handleStatusChange = async (newStatus: Status) => { /* ... implementare status change ... */
        setIsUpdatingStatus(true);
        try {
          let newEndDate: Date | null = mayor.subscriptionEndDate ? new Date(mayor.subscriptionEndDate) : null;
          if (newStatus === 'ACTIVE' && mayor.subscriptionStatus !== 'ACTIVE') {
            newEndDate = new Date(); newEndDate.setFullYear(newEndDate.getFullYear() + 1);
          } else if (newStatus === 'INACTIVE' || newStatus === 'PENDING') { newEndDate = null; }

          const result = await updateMayorStatus(mayor.id, newStatus, newEndDate, meta.actorId);
          if (result.success) {
            toast({ title: "Succes", description: `Starea primarului '${mayor.name}' actualizată la ${newStatus}.` });
            meta.refetchData();
          } else { throw new Error(result.error || "Nu s-a putut actualiza starea."); }
        } catch (error) {
          toast({ variant: "destructive", title: "Eroare", description: error instanceof Error ? error.message : "A apărut o eroare." });
        } finally { setIsUpdatingStatus(false); }
      };
      return (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Deschide meniu</span> <MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => meta.openEditDialog(mayor)}><Edit className="mr-2 h-4 w-4" /> Editează detalii</DropdownMenuItem>
              <DropdownMenuItem onClick={() => meta.openResetPasswordDialog(mayor)}><KeyRound className="mr-2 h-4 w-4" /> Resetează parola</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={isUpdatingStatus}> {mayor.subscriptionStatus === 'ACTIVE' ? <PowerOff className="mr-2 h-4 w-4 text-destructive" /> : <Power className="mr-2 h-4 w-4 text-green-600" />}<span>Schimbă starea</span></DropdownMenuSubTrigger>
                <DropdownMenuPortal><DropdownMenuSubContent>
                  <DropdownMenuItem disabled={isUpdatingStatus || mayor.subscriptionStatus === 'ACTIVE'} onClick={() => handleStatusChange('ACTIVE')}><ShieldCheck className="mr-2 h-4 w-4 text-green-600" /> Activează</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isUpdatingStatus || mayor.subscriptionStatus === 'INACTIVE'} onClick={() => handleStatusChange('INACTIVE')}><ShieldAlert className="mr-2 h-4 w-4" /> Dezactivează</DropdownMenuItem>
                  <DropdownMenuItem className="text-muted-foreground focus:text-foreground focus:bg-accent" disabled={isUpdatingStatus || mayor.subscriptionStatus === 'PENDING'} onClick={() => handleStatusChange('PENDING')}><HelpCircle className="mr-2 h-4 w-4" /> Setează în așteptare</DropdownMenuItem>
                </DropdownMenuSubContent></DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Șterge cont
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Acest AlertDialog este pentru ȘTERGERE */}
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Sunteți absolut sigur?</AlertDialogTitle><AlertDialogDescription>Această acțiune va șterge permanent contul de primar pentru <strong>{mayor.name}</strong> (sate: {mayor.managedVillages.map(v => v.name).join(', ')}) și satele asociate.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Anulează</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}{isDeleting ? 'Se șterge...' : 'Șterge'}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    },
  },
];

export function MayorTable({ refreshKey, actorId }: { refreshKey?: number; actorId: string }) {
  // ... (state-uri și funcții rămân la fel ca în răspunsul anterior) ...
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ email: false, subscriptionEndDate: false, updatedAt: false, });
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<MayorWithManagedVillages[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingMayor, setEditingMayor] = React.useState<MayorWithManagedVillages | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editVillagesInput, setEditVillagesInput] = React.useState('');
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  // State pentru dialogul de resetare parolă
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = React.useState(false);
  const [resettingMayor, setResettingMayor] = React.useState<MayorWithManagedVillages | null>(null);
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);

  const fetchData = React.useCallback(async () => { /* ... implementare fetchData ... */
    setLoading(true); setError(null);
    try {
      const mayors = await getAllMayors();
      setData(mayors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-au putut încărca datele.');
      setData([]);
      toast({ variant: "destructive", title: "Eroare", description: "Nu s-au putut încărca datele primarilor." });
    } finally { setLoading(false); }
  }, [toast]);

  React.useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  const openEditDialog = (mayor: MayorWithManagedVillages) => { /* ... implementare ... */
    setEditingMayor(mayor);
    setEditName(mayor.name);
    setEditEmail(mayor.email);
    setEditVillagesInput(mayor.managedVillages.map(v => v.name).join(', '));
    setIsEditDialogOpen(true);
  };

  // Funcție pentru a deschide dialogul de resetare parolă
  const openResetPasswordDialog = (mayor: MayorWithManagedVillages) => {
    setResettingMayor(mayor);
    setIsResetPasswordDialogOpen(true);
  };

  const handleConfirmResetPassword = async () => { /* ... implementare reset password ... */
    if (!resettingMayor) return;
    setIsResettingPassword(true);
    try {
      const result = await resetMayorPasswordByAdmin(resettingMayor.id, actorId);
      if (result.success && result.temporaryPassword) {
        toast({
          title: "Parolă resetată",
          description: (<div>Parola pentru {resettingMayor.name} a fost resetată. <br /> Noua parolă temporară este: <strong className="font-mono">{result.temporaryPassword}</strong>.<br /> Comunicați-o primarului.</div>),
          duration: 15000,
        });
        setIsResetPasswordDialogOpen(false); // Închide dialogul de resetare
      } else { throw new Error(result.error || "Nu s-a putut reseta parola."); }
    } catch (error) {
      toast({ variant: "destructive", title: "Eroare la resetarea parolei", description: error instanceof Error ? error.message : "A apărut o eroare." });
    } finally { setIsResettingPassword(false); }
  };

  const handleSaveEdit = async () => { /* ... implementare save edit ... */
    if (!editingMayor || !editName.trim() || !editEmail.trim()) {
      toast({ variant: "destructive", title: "Eroare", description: "Numele și emailul nu pot fi goale." }); return;
    }
    if (!/\S+@\S+\.\S+/.test(editEmail)) {
      toast({ variant: "destructive", title: "Eroare", description: "Introduceți o adresă de email validă." }); return;
    }

    const newVillageNames = editVillagesInput.split(',').map(v => v.trim()).filter(v => v.length > 0);
    setIsSavingEdit(true);
    try {
      const changes: UpdateMayorDetailsData = {};
      if (editName !== editingMayor.name) changes.name = editName;
      if (editEmail !== editingMayor.email) changes.email = editEmail;

      const currentVillageNames = editingMayor.managedVillages.map(v => v.name).sort().join(',');
      const newVillageNamesSortedString = [...new Set(newVillageNames)].sort().join(',');

      if (currentVillageNames !== newVillageNamesSortedString) {
        changes.villageNames = [...new Set(newVillageNames)];
      }

      if (Object.keys(changes).length === 0) {
        toast({ title: "Info", description: "Nicio modificare detectată." });
        setIsEditDialogOpen(false); setEditingMayor(null); return;
      }

      const result = await updateMayorDetails(editingMayor.id, changes, actorId);
      if (result.success) {
        toast({ title: "Succes", description: result.message || `Detaliile primarului '${editName}' au fost actualizate.` });
        setIsEditDialogOpen(false); setEditingMayor(null);
        fetchData();
      } else { throw new Error(result.error || "Nu s-au putut actualiza detaliile."); }
    } catch (error) {
      toast({ variant: "destructive", title: "Eroare la actualizare", description: error instanceof Error ? error.message : "A apărut o eroare." });
    } finally { setIsSavingEdit(false); }
  };

  const table = useReactTable({
    data, columns, onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility, onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    meta: {
      refetchData: fetchData,
      openEditDialog: openEditDialog,
      openResetPasswordDialog: openResetPasswordDialog, // Adăugat la meta
      actorId: actorId,
      removeRow: (id) => setData((prev) => prev.filter((row) => row.id !== id)),
      updateRow: (id, updatedData) => setData((prev) => prev.map((row) => (row.id === id ? { ...row, ...updatedData } : row))),
    } as MayorTableMeta,
  });

  if (loading) return <MayorTableSkeleton />;
  if (error) return <div className="text-destructive p-4 border border-destructive/50 rounded-md">Eroare: {error}</div>;

  return (
    <div className="w-full">
      {/* ... JSX pentru tabel, paginare ... (la fel ca înainte) */}
      <div className="flex items-center py-4">
        <Input placeholder="Filtrează după nume..." value={(table.getColumn('name')?.getFilterValue() as string) ?? ''} onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)} className="max-w-sm" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" className="ml-auto">Coloane <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Arată/Ascunde coloane</DropdownMenuLabel><DropdownMenuSeparator />
            {table.getAllColumns().filter(c => c.getCanHide()).map(col => (
              <DropdownMenuCheckboxItem key={col.id} className="capitalize" checked={col.getIsVisible()} onCheckedChange={val => col.toggleVisibility(!!val)}>
                {col.id === 'managedVillages' ? 'Sate gestionate' : col.id === 'subscriptionEndDate' ? 'Sfârșit abon.' : col.id === 'subscriptionStatus' ? 'Status abon.' : col.id.replace(/([A-Z])/g, ' $1')}
              </DropdownMenuCheckboxItem>))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>{table.getHeaderGroups().map(hg => (<TableRow key={hg.id}>{hg.headers.map(h => (<TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>))}</TableRow>))}</TableHeader>
          <TableBody>{table.getRowModel().rows?.length ? (table.getRowModel().rows.map(row => (<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>))) : (<TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Niciun rezultat.</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">{table.getFilteredSelectedRowModel().rows.length} din {table.getFilteredRowModel().rows.length} rând(uri) selectate.</div>
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Următor</Button>
      </div>

      {/* Dialog pentru Editare Primar - Folosește Dialog și ShadDialogContent */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <ShadDialogContent className="sm:max-w-[475px]">
          <ShadDialogHeader>
            <ShadDialogTitle>Editează primar: {editingMayor?.name}</ShadDialogTitle>
            <ShadDialogDescription>Actualizați detaliile. Salvați când ați terminat.</ShadDialogDescription>
          </ShadDialogHeader>
          <div className="grid gap-4 py-4">
            {/* ... câmpurile formularului de editare ... */}
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-mayor-name" className="text-right">Nume *</Label><Input id="edit-mayor-name" value={editName} onChange={e => setEditName(e.target.value)} className="col-span-3" disabled={isSavingEdit} /></div>
            <div className="grid grid-cols-4 items-start gap-4"><Label htmlFor="edit-mayor-villages" className="text-right pt-2">Sate * <br /><span className="text-xs text-muted-foreground">(virgulă)</span></Label><Textarea id="edit-mayor-villages" value={editVillagesInput} onChange={e => setEditVillagesInput(e.target.value)} className="col-span-3" rows={3} disabled={isSavingEdit} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-mayor-email" className="text-right">Email *</Label><Input id="edit-mayor-email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="col-span-3" disabled={isSavingEdit} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSavingEdit}>Anulează</Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editName || !editEmail || (editVillagesInput.trim() === '' && editingMayor?.managedVillages && editingMayor.managedVillages.length > 0)}>
              {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvează
            </Button>
          </DialogFooter>
        </ShadDialogContent>
      </Dialog>

      {/* CORECȚIE: Dialog pentru Resetare Parolă - Folosește AlertDialog și AlertDialogContent */}
      <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <AlertDialogContent className="sm:max-w-md"> {/* Folosește AlertDialogContent */}
          <AlertDialogHeader>
            <AlertDialogTitle>Resetați parola pentru {resettingMayor?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune va genera o nouă parolă temporară pentru primarul{" "}
              <strong>{resettingMayor?.name}</strong> ({resettingMayor?.managedVillages.map(v => v.name).join(', ')}).
              Primarul va trebui să o schimbe la următoarea autentificare.
              Parola temporară va fi afișată după confirmare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsResetPasswordDialogOpen(false)} disabled={isResettingPassword}>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmResetPassword} disabled={isResettingPassword} className="bg-orange-500 hover:bg-orange-600">
              {isResettingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              {isResettingPassword ? 'Se resetează...' : 'Da, resetează parola'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Definiția pentru MayorTableSkeleton
function MayorTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center py-4"> <Skeleton className="h-10 w-full max-w-sm" /> <Skeleton className="h-10 w-24 ml-auto" /> </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow>{[...Array(7)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}</TableRow></TableHeader>
          <TableBody>{[...Array(5)].map((_, i) => (<TableRow key={i}>{[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>))}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4"> <Skeleton className="h-5 w-28 flex-1" /> <Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-16" /> </div>
    </div>
  );
}