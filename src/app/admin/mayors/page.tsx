// src/app/admin/mayors/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Shield, Loader2 } from 'lucide-react';
import { MayorTable } from './components/mayor-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Folosim Textarea pentru sate multiple
import { addMayor } from '@/services/mayors';
import { useToast } from '@/hooks/use-toast';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const adminActorId = "Admin_System"; // Sau preluat din sesiune/context dacă adminul e un utilizator logat

export default function AdminMayorsPage() {
  const cardTitle = "Gestionare primari";
  const cardDescription = "Vizualizați, adăugați, editați sau gestionați conturile primarilor și abonamentele acestora.";
  const addMayorButton = "Adaugă primar";
  const addMayorDialogTitle = "Adaugă primar nou";
  const addMayorDialogDescription = "Introduceți detaliile pentru noul cont de primar. Specificați satele gestionate, separate prin virgulă.";
  const nameLabel = "Nume";
  const villagesLabel = "Sate gestionate (separate prin virgulă)"; // MODIFICAT
  const emailLabel = "Email";
  const passwordLabel = "Parolă";
  const passwordPlaceholder = "Introduceți parola inițială (minim 8 caractere)";
  const cancelButton = "Anulează";
  const saveButton = "Adaugă primar";
  const savingButton = "Se salvează...";

  const [isAddMayorOpen, setIsAddMayorOpen] = React.useState(false);
  const [newMayorName, setNewMayorName] = React.useState('');
  const [newMayorVillagesInput, setNewMayorVillagesInput] = React.useState(''); // MODIFICAT: Input pentru sate ca string
  const [newMayorEmail, setNewMayorEmail] = React.useState('');
  const [newMayorPassword, setNewMayorPassword] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [tableKey, setTableKey] = React.useState(Date.now());
  const { toast } = useToast();

  const resetForm = () => {
    setNewMayorName('');
    setNewMayorVillagesInput(''); // MODIFICAT
    setNewMayorEmail('');
    setNewMayorPassword('');
    setIsSaving(false);
  }

  const handleAddMayor = async () => {
    const villageNames = newMayorVillagesInput.split(',').map(v => v.trim()).filter(v => v.length > 0);

    if (!newMayorName || villageNames.length === 0 || !newMayorEmail || !newMayorPassword) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Numele primarului, cel puțin un sat, emailul și parola sunt obligatorii.",
      });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(newMayorEmail)) {
      toast({ variant: "destructive", title: "Eroare", description: "Introduceți o adresă de email validă." });
      return;
    }
    if (newMayorPassword.length < 8) {
      toast({ variant: "destructive", title: "Eroare", description: "Parola trebuie să aibă cel puțin 8 caractere." });
      return;
    }

    setIsSaving(true);
    try {
      const result = await addMayor({
        name: newMayorName,
        villageNames: villageNames, // Trimitem array-ul de nume de sate
        email: newMayorEmail,
        password: newMayorPassword,
      }, adminActorId);

      if (result.success) {
        toast({
          title: "Succes",
          description: `Contul de primar pentru '${newMayorName}' gestionând satele (${villageNames.join(', ')}) a fost creat cu succes.`,
        });
        setIsAddMayorOpen(false);
        resetForm();
        setTableKey(Date.now());
      } else {
        throw new Error(result.error || "Nu s-a putut adăuga primarul.");
      }
    } catch (error) {
      console.error("Failed to add mayor:", error);
      toast({
        variant: "destructive",
        title: "Eroare la adăugarea primarului",
        description: error instanceof Error ? error.message : "A apărut o eroare necunoscută.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> {cardTitle}</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setIsAddMayorOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{addMayorButton}</span>
          </Button>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<MayorTableSkeleton />}>
            <MayorTable refreshKey={tableKey} actorId={adminActorId} />
          </Suspense>
        </CardContent>
      </Card>

      <Dialog open={isAddMayorOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsAddMayorOpen(open);
      }}>
        <DialogContent className="sm:max-w-[475px]"> {/* Mărit puțin pentru Textarea */}
          <DialogHeader>
            <DialogTitle>{addMayorDialogTitle}</DialogTitle>
            <DialogDescription>{addMayorDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-name" className="text-right">{nameLabel} *</Label>
              <Input id="add-name" value={newMayorName} onChange={(e) => setNewMayorName(e.target.value)} className="col-span-3" disabled={isSaving} />
            </div>
            <div className="grid grid-cols-4 items-start gap-4"> {/* items-start pentru Textarea */}
              <Label htmlFor="add-villages" className="text-right pt-2">{villagesLabel} *</Label>
              {/* MODIFICAT: Input la Textarea pentru sate multiple */}
              <Textarea
                id="add-villages"
                value={newMayorVillagesInput}
                onChange={(e) => setNewMayorVillagesInput(e.target.value)}
                className="col-span-3"
                rows={3}
                placeholder="Ex: SatulMare, SatulMic, AltSat"
                disabled={isSaving}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-email" className="text-right">{emailLabel} *</Label>
              <Input id="add-email" type="email" value={newMayorEmail} onChange={(e) => setNewMayorEmail(e.target.value)} className="col-span-3" placeholder="primar@exemplu.com" disabled={isSaving} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-password" className="text-right">{passwordLabel} *</Label>
              <Input
                id="add-password"
                type="password"
                value={newMayorPassword}
                onChange={(e) => setNewMayorPassword(e.target.value)}
                className="col-span-3"
                placeholder={passwordPlaceholder}
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddMayorOpen(false)} disabled={isSaving}>{cancelButton}</Button>
            <Button
              type="button"
              onClick={handleAddMayor}
              disabled={isSaving || !newMayorName || !newMayorVillagesInput.trim() || !newMayorEmail || !newMayorPassword || newMayorPassword.length < 8}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? savingButton : saveButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MayorTableSkeleton() {
  // ... (skeleton-ul rămâne la fel ca înainte)
  return (
    <div className="space-y-3">
      <div className="flex items-center py-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-24 ml-auto" />
      </div>
      <div className="rounded-md border">
        <TableSkeleton rows={5} cells={7} />
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Skeleton className="h-5 w-28 flex-1" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-16" />
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5, cells = 5 }) {
  // ... (skeleton-ul rămâne la fel ca înainte)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {[...Array(cells)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(rows)].map((_, i) => (
          <TableRow key={i}>
            {[...Array(cells)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}