// src/app/admin/farmers/components/farmer-table.tsx
'use client';

import * as React from 'react';
import {
  ColumnDef, ColumnFiltersState, SortingState, VisibilityState,
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Trash2, Edit, Palette, KeyRound, Loader2, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  type Farmer,
  deleteFarmer,
  updateFarmer,
  type UpdateFarmerData,
  resetFarmerPasswordByMayor,
  getAllFarmers,
  getFarmersByVillages
} from '@/services/farmers';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// CORECȚIE IMPORT ALIASURI:
import {
  Dialog,
  DialogContent as ShadDialogContent,
  DialogHeader as ShadDialogHeader, // Alias corectat
  DialogTitle as ShadDialogTitle,
  DialogDescription as ShadDialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { useSession } from 'next-auth/react';

type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; villages?: string[] };

interface FarmerTableMeta {
  refetchData: () => void;
  openEditDialog: (farmer: Omit<Farmer, 'password'>) => void;
  openResetPasswordDialog: (farmer: Omit<Farmer, 'password'>) => void;
  actorId: string;
  actorRole: 'admin' | 'mayor';
  currentMayorSelectedVillageForEdit?: string | null;
  readOnly?: boolean;
}

export const columns: ColumnDef<Omit<Farmer, 'password'>>[] = [
  {
    id: 'select',
    header: ({ table }) => (<Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="Selectează tot" />),
    cell: ({ row }) => (<Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Selectează rând" />),
    enableSorting: false, enableHiding: false,
  },
  { accessorKey: 'name', header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Nume <ArrowUpDown className="ml-2 h-4 w-4" /></Button>), cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div> },
  { accessorKey: 'companyCode', header: 'Cod fiscal', cell: ({ row }) => <div>{row.getValue('companyCode')}</div> },
  { accessorKey: 'village', header: 'Sat principal', cell: ({ row }) => <div>{row.getValue('village')}</div> },
  { accessorKey: 'email', header: 'Email', cell: ({ row }) => <div>{(row.getValue('email') as string) || '-'}</div> },
  { accessorKey: 'phone', header: 'Telefon', cell: ({ row }) => <div>{(row.getValue('phone') as string) || '-'}</div> },
  {
    accessorKey: 'color',
    header: () => <div className="flex items-center"><Palette className="mr-2 h-4 w-4" />Culoare</div>,
    cell: ({ row }) => {
      const color = row.getValue('color') as string | null;
      return color ? <div className="flex items-center gap-2"> <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color }}></div> <span className="font-mono text-xs">{color}</span></div> : '-';
    }
  },
  {
    accessorKey: 'updatedAt',
    header: 'Ultima actualizare',
    cell: ({ row }) => {
      const date = row.getValue('updatedAt') as string | Date;
      return new Date(date).toLocaleDateString();
    }
  },
  {
    id: 'actions', enableHiding: false,
    cell: ({ row, table }) => {
      const farmer = row.original;
      const { toast } = useToast();
      const [isDeleting, setIsDeleting] = React.useState(false);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
      const meta = table.options.meta as FarmerTableMeta;

      const handleDelete = async () => {
        setIsDeleting(true);
        try {
          const result = await deleteFarmer(farmer.id, meta.actorId);
          if (result.success) {
            toast({ title: "Succes", description: `Agricultorul '${farmer.name}' a fost șters.` });
            setIsDeleteDialogOpen(false);
            meta.refetchData();
          } else { throw new Error(result.error || "Nu s-a putut șterge agricultorul."); }
        } catch (error) {
          toast({ variant: "destructive", title: "Eroare", description: error instanceof Error ? error.message : "A apărut o eroare la ștergere." });
        } finally { setIsDeleting(false); }
      };

      return (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Deschide meniu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => meta.openEditDialog(farmer)}><Edit className="mr-2 h-4 w-4" /> Editează</DropdownMenuItem>
              {(meta.actorRole === 'admin' || meta.actorRole === 'mayor') && (
                <DropdownMenuItem onClick={() => meta.openResetPasswordDialog(farmer)}>
                  <KeyRound className="mr-2 h-4 w-4" /> Resetează parola
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Șterge
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Sunteți absolut sigur?</AlertDialogTitle><AlertDialogDescription>Această acțiune nu poate fi anulată. Va șterge permanent datele agricultorului <strong>{farmer.name}</strong> ({farmer.companyCode}).</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Anulează</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}{isDeleting ? 'Se șterge...' : 'Șterge'}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    },
  },
];

export function FarmerTable({
  refreshKey,
  actorId: initialActorId,
  actorRole,
  villageFilter,
  readOnly = false, // Este OK să ai o valoare default aici
}: { // <--- AICI ESTE LOCUL UNDE TREBUIE SĂ ADUGI readOnly
  refreshKey?: number;
  actorId?: string;
  actorRole: 'admin' | 'mayor';
  villageFilter?: string | null;
  readOnly?: boolean; // <--- ADAUGĂ ACEASTĂ LINIE AICI
}) {
  const { data: session } = useSession();
  const typedUser = session?.user as SessionUser | undefined;
  const actorId = initialActorId || typedUser?.id || "unknown_actor";
  const mayorManagedVillages = actorRole === 'mayor' ? typedUser?.villages : undefined;

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ email: false, phone: false, updatedAt: false });
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<Omit<Farmer, 'password'>[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingFarmer, setEditingFarmer] = React.useState<Omit<Farmer, 'password'> | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editCompanyCode, setEditCompanyCode] = React.useState('');
  const [editVillage, setEditVillage] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [editColor, setEditColor] = React.useState('');
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = React.useState(false);
  const [resettingFarmer, setResettingFarmer] = React.useState<Omit<Farmer, 'password'> | null>(null);
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let farmersData: Omit<Farmer, 'password'>[] = [];
      if (actorRole === 'mayor') {
        if (villageFilter) {
          farmersData = await getFarmersByVillages([villageFilter]);
        } else if (mayorManagedVillages && mayorManagedVillages.length > 0) {
          farmersData = await getFarmersByVillages(mayorManagedVillages);
        } else {
          farmersData = [];
          if (!mayorManagedVillages || mayorManagedVillages.length === 0 && actorRole === 'mayor') {
            console.warn("FarmerTable (Mayor): Niciun sat gestionat de primar pentru filtrare.");
          }
        }
      } else {
        farmersData = await getAllFarmers(villageFilter || undefined);
      }
      setData(farmersData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nu s-au putut încărca datele agricultorilor.';
      setError(errorMessage);
      setData([]);
      toast({ variant: "destructive", title: "Eroare la încărcare", description: errorMessage });
    } finally { setLoading(false); }
  }, [toast, actorRole, villageFilter, mayorManagedVillages]);

  React.useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  const openEditDialog = (farmer: Omit<Farmer, 'password'>) => {
    setEditingFarmer(farmer);
    setEditName(farmer.name);
    setEditCompanyCode(farmer.companyCode);
    setEditVillage(farmer.village);
    setEditEmail(farmer.email || '');
    setEditPhone(farmer.phone || '');
    setEditColor(farmer.color || '');
    setIsEditDialogOpen(true);
  };

  const openResetPasswordDialog = (farmer: Omit<Farmer, 'password'>) => {
    setResettingFarmer(farmer);
    setIsResetPasswordDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFarmer || !editName.trim() || !editCompanyCode.trim() || !editVillage.trim()) {
      toast({ variant: "destructive", title: "Eroare", description: "Numele, codul fiscal și satul de înregistrare sunt obligatorii." }); return;
    }
    if (editEmail && !/\S+@\S+\.\S+/.test(editEmail)) {
      toast({ variant: "destructive", title: "Eroare", description: "Format email invalid." }); return;
    }

    let canUpdateVillage = actorRole === 'admin';
    if (actorRole === 'mayor') {
      if (editingFarmer.village !== editVillage) {
        if (mayorManagedVillages && !mayorManagedVillages.includes(editVillage)) {
          toast({ variant: "destructive", title: "Acțiune nepermisă", description: `Ca primar, nu puteți schimba satul de înregistrare al agricultorului într-un sat pe care nu îl gestionați (${editVillage}).` });
          return;
        }
        canUpdateVillage = true;
      } else {
        canUpdateVillage = true;
      }
    }

    setIsSavingEdit(true);
    try {
      const dataToUpdate: UpdateFarmerData = {
        name: editName,
        companyCode: editCompanyCode,
        village: canUpdateVillage ? editVillage : editingFarmer.village,
        email: editEmail || null,
        phone: editPhone || null,
        color: editColor || null,
      };
      const result = await updateFarmer(editingFarmer.id, dataToUpdate, actorId);
      if (result.success) {
        toast({ title: "Succes", description: `Datele agricultorului '${editName}' au fost actualizate.` });
        setIsEditDialogOpen(false); setEditingFarmer(null);
        fetchData();
      } else { throw new Error(result.error || "Nu s-au putut actualiza datele."); }
    } catch (error) {
      toast({ variant: "destructive", title: "Eroare la actualizare", description: error instanceof Error ? error.message : "A apărut o eroare la actualizarea datelor." });
    } finally { setIsSavingEdit(false); }
  };

  const handleConfirmResetPassword = async () => {
    if (!resettingFarmer) return;
    setIsResettingPassword(true);
    try {
      const result = await resetFarmerPasswordByMayor(resettingFarmer.id, actorId);
      if (result.success && result.temporaryPassword) {
        toast({
          title: "Parolă resetată",
          description: (<div>Parola pentru {resettingFarmer.name} a fost resetată. <br /> Noua parolă temporară este: <strong className="font-mono">{result.temporaryPassword}</strong>.<br /> Comunicați-o agricultorului. Acesta va trebui să o schimbe la prima conectare.</div>),
          duration: 15000,
        });
        setIsResetPasswordDialogOpen(false);
      } else {
        throw new Error(result.error || "Nu s-a putut reseta parola.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Eroare la resetarea parolei", description: error instanceof Error ? error.message : "A apărut o eroare." });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const table = useReactTable({
    data, columns, onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility, onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    meta: {
      refetchData: fetchData,
      openEditDialog,
      openResetPasswordDialog,
      actorId,
      actorRole,
      currentMayorSelectedVillageForEdit: villageFilter
    } as FarmerTableMeta,
  });

  if (loading) return <FarmerTableSkeleton />;
  if (error && data.length === 0) return <div className="text-destructive p-4 border border-destructive/50 rounded-md">Eroare la încărcarea tabelului: {error}</div>;
  // Chiar dacă e eroare, dar avem date vechi, le afișăm și toast-ul va arăta eroarea.

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrează după nume, cod fiscal, sat..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''} // Simplificat, filtrează pe coloana 'name'
          onChange={(event) => {
            table.getColumn('name')?.setFilterValue(event.target.value)
            // Pentru a filtra pe multiple coloane simultan din acest input,
            // ar trebui setat un globalFilter sau filtrat pe fiecare coloană.
            // Sau, se poate crea o funcție de filtrare custom.
            // Momentan, acest input va filtra pe baza primei coloane setate (name).
          }}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" className="ml-auto">Coloane <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Arată/Ascunde coloane</DropdownMenuLabel><DropdownMenuSeparator />
            {table.getAllColumns().filter(c => c.getCanHide()).map(col => {
              let displayName = col.id.replace(/([A-Z])/g, ' $1');
              if (col.id === 'companyCode') displayName = 'Cod fiscal';
              if (col.id === 'village') displayName = 'Sat principal';
              if (col.id === 'updatedAt') displayName = 'Ultima actualizare';
              return (<DropdownMenuCheckboxItem key={col.id} className="capitalize" checked={col.getIsVisible()} onCheckedChange={val => col.toggleVisibility(!!val)}>{displayName}</DropdownMenuCheckboxItem>)
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>{table.getHeaderGroups().map(hg => (<TableRow key={hg.id}>{hg.headers.map(h => (<TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>))}</TableRow>))}</TableHeader>
          <TableBody>{table.getRowModel().rows?.length ? (table.getRowModel().rows.map(row => (<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>{row.getVisibleCells().map(cell => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}</TableRow>))) : (<TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Niciun agricultor găsit.</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">{table.getFilteredSelectedRowModel().rows.length} din {table.getFilteredRowModel().rows.length} rând(uri) selectate.</div>
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Următor</Button>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <ShadDialogContent className="sm:max-w-md">
          {/* Folosim aliasurile corecte pentru componentele Dialog */}
          <ShadDialogHeader>
            <ShadDialogTitle>Editează agricultor: {editingFarmer?.name}</ShadDialogTitle>
            <ShadDialogDescription>Modificați detaliile agricultorului.</ShadDialogDescription>
          </ShadDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-farmer-name" className="text-right">Nume *</Label><Input id="edit-farmer-name" value={editName} onChange={e => setEditName(e.target.value)} className="col-span-3" disabled={isSavingEdit} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-farmer-code" className="text-right">Cod fiscal *</Label><Input id="edit-farmer-code" value={editCompanyCode} onChange={e => setEditCompanyCode(e.target.value)} className="col-span-3" disabled={isSavingEdit} /></div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-farmer-village" className="text-right">Sat înreg. *</Label>
              <Input
                id="edit-farmer-village"
                value={editVillage}
                onChange={e => setEditVillage(e.target.value)}
                className="col-span-3"
                disabled={isSavingEdit || (actorRole === 'mayor')} // Primarul nu poate schimba satul principal aici
                title={actorRole === 'mayor' ? "Primarii nu pot schimba satul principal de înregistrare." : ""}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-farmer-email" className="text-right">Email</Label><Input id="edit-farmer-email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="col-span-3" disabled={isSavingEdit} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-farmer-phone" className="text-right">Telefon</Label><Input id="edit-farmer-phone" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="col-span-3" disabled={isSavingEdit} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-farmer-color" className="text-right">Culoare</Label><Input id="edit-farmer-color" type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="col-span-2 h-10" disabled={isSavingEdit} /><span className="col-span-1 text-xs text-muted-foreground">Lasă gol pt. auto.</span></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSavingEdit}>Anulează</Button><Button onClick={handleSaveEdit} disabled={isSavingEdit || !editName || !editCompanyCode || !editVillage}>{isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvează</Button></DialogFooter>
        </ShadDialogContent>
      </Dialog>

      <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Resetați parola pentru {resettingFarmer?.name}?</AlertDialogTitle><AlertDialogDescription>Această acțiune va genera o parolă temporară. Agricultorul va trebui să o schimbe la următoarea autentificare.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setIsResetPasswordDialogOpen(false)} disabled={isResettingPassword}>Anulează</AlertDialogCancel><AlertDialogAction onClick={handleConfirmResetPassword} disabled={isResettingPassword} className="bg-orange-500 hover:bg-orange-600">{isResettingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}{isResettingPassword ? 'Se resetează...' : 'Da, resetează'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FarmerTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center py-4"><Skeleton className="h-10 w-full max-w-sm" /><Skeleton className="h-10 w-24 ml-auto" /></div>
      <div className="rounded-md border">
        <Table><TableHeader><TableRow>{[...Array(8)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}</TableRow></TableHeader>
          <TableBody>{[...Array(5)].map((_, i) => (<TableRow key={i}>{[...Array(8)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>))}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4"><Skeleton className="h-5 w-28 flex-1" /><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-16" /></div>
    </div>
  );
}