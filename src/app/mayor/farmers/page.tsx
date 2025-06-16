// src/app/mayor/farmers/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useMayorVillageContext } from '@/components/layout/MayorLayoutClient';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import { PlusCircle, Users, Loader2, AlertCircle, UserPlus, Search } from 'lucide-react';

// Services & Components
import { addFarmer, getFarmerByCompanyCode } from '@/services/farmers';
import { FarmerTable } from '@/app/admin/farmers/components/farmer-table'; // Refolosim componenta din admin

// Translations (versiunea completă din codul 1)
const t = {
  pageTitle: "Gestionare agricultori",
  pageDescriptionBase: "Vizualizați, adăugați sau editați agricultorii",
  pageDescriptionForVillage: "pentru satul",
  pageDescriptionForAllVillages: "din toate satele gestionate.",
  addFarmerButton: "Adaugă agricultor nou",
  addExistingFarmerButton: "Asociază agricultor existent",
  addDialogTitle: "Adaugă agricultor nou",
  addDialogDescriptionBase: "Introduceți detaliile complete pentru noul agricultor.",
  addDialogDescriptionForVillage: "Acesta va fi înregistrat în satul",
  addDialogDescriptionForMultiple: "Selectați satul de înregistrare.",
  addExistingDialogTitle: "Asociază agricultor după cod fiscal",
  addExistingDialogDescription: "Introduceți codul fiscal al unui agricultor existent pentru a-l face vizibil în listele dvs. și a-i putea atribui parcele.",
  nameLabel: "Nume complet *",
  namePlaceholder: "Ex: Ion Creangă",
  companyCodeLabel: "Cod fiscal (IDNO/IDNP) *",
  companyCodePlaceholder: "Ex: 1234567890123",
  villageLabel: "Sat de înregistrare *",
  villagePlaceholder: "Selectați satul",
  emailLabel: "Email (opțional)",
  emailPlaceholder: "agricultor@exemplu.com",
  phoneLabel: "Telefon (opțional)",
  phonePlaceholder: "Ex: 069xxxxxx",
  passwordLabel: "Parolă inițială *",
  passwordPlaceholder: "Minim 8 caractere",
  colorLabel: "Culoare hartă (opțional)",
  colorInputHelper: "Lasă gol pentru auto.",
  cancelButton: "Anulează",
  saveButton: "Adaugă agricultor",
  savingButton: "Se salvează...",
  searchButton: "Caută",
  errorTitle: "Eroare",
  successTitle: "Succes",
  noVillagesManagedError: "Nu gestionați niciun sat. Vă rugăm contactați administratorul.",
  farmerExistsTitle: "Agricultor existent",
  farmerExistsDescription: "Un agricultor cu acest cod fiscal există deja. Doriți să îl asociați la gestiunea dvs.? Acesta va deveni vizibil pentru atribuirea de parcele.",
  confirmAssociationButton: "Da, asociază-l",
  farmerAssociatedSuccess: "Agricultorul a fost asociat cu succes și este acum vizibil în liste.",
  farmerNotFound: "Niciun agricultor găsit cu acest cod fiscal.",
};

export default function MayorFarmersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { selectedVillage, managedVillages, isContextLoading } = useMayorVillageContext();
  const { toast } = useToast();

  // Stări pentru dialoguri
  const [isAddFarmerDialogOpen, setIsAddFarmerDialogOpen] = useState(false);
  const [isAddExistingFarmerDialogOpen, setIsAddExistingFarmerDialogOpen] = useState(false);
  const [isFarmerExistsAlertOpen, setIsFarmerExistsAlertOpen] = useState(false);

  // Stări generale
  const [isSaving, setIsSaving] = useState(false);
  const [tableKey, setTableKey] = useState(Date.now());

  // Stări pentru formulare
  const [newFarmerData, setNewFarmerData] = useState({ name: '', companyCode: '', village: '', email: '', phone: '', password: '', color: '#563d7c' });
  const [existingFarmerCode, setExistingFarmerCode] = useState('');
  const [farmerToAssociate, setFarmerToAssociate] = useState<{ id: string; code: string } | null>(null);

  // Descrieri dinamice (optimizate cu useMemo)
  const pageDescription = useMemo(() => {
    if (isContextLoading) return `${t.pageDescriptionBase}...`;
    if (managedVillages.length === 0) return t.noVillagesManagedError;
    return selectedVillage
      ? `${t.pageDescriptionBase} ${t.pageDescriptionForVillage} ${selectedVillage}.`
      : `${t.pageDescriptionBase} ${t.pageDescriptionForAllVillages}`;
  }, [selectedVillage, managedVillages, isContextLoading]);

  const addDialogDescription = useMemo(() => {
    if (managedVillages.length === 1) {
      return `${t.addDialogDescriptionBase} ${t.addDialogDescriptionForVillage} ${managedVillages[0]}.`;
    }
    return `${t.addDialogDescriptionBase} ${t.addDialogDescriptionForMultiple}`;
  }, [managedVillages]);

  // Resetarea formularului (optimizată cu useCallback)
  const resetAddFarmerForm = useCallback(() => {
    const defaultVillage = selectedVillage && managedVillages.includes(selectedVillage)
      ? selectedVillage
      : managedVillages[0] || '';
    setNewFarmerData({ name: '', companyCode: '', village: defaultVillage, email: '', phone: '', password: '', color: '#563d7c' });
    setIsSaving(false);
  }, [managedVillages, selectedVillage]);

  // Setează satul implicit când contextul este gata
  useEffect(() => {
    if (!isContextLoading && managedVillages.length > 0) {
      resetAddFarmerForm();
    }
  }, [isContextLoading, managedVillages, resetAddFarmerForm]);

  const handleInputChange = (field: keyof typeof newFarmerData, value: string) => {
    setNewFarmerData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddFarmerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { name, companyCode, village, password } = newFarmerData;
    if (!name || !companyCode || !village || !password || password.length < 8) {
      toast({ variant: "destructive", title: t.errorTitle, description: "Toate câmpurile marcate cu * sunt obligatorii. Parola trebuie să aibă minim 8 caractere." });
      return;
    }

    setIsSaving(true);
    const actorId = session?.user?.id;
    if (!actorId) {
      toast({ variant: "destructive", title: t.errorTitle, description: "Eroare de autentificare." });
      setIsSaving(false);
      return;
    }

    try {
      const result = await addFarmer(newFarmerData, actorId);
      if (result.success) {
        toast({ title: t.successTitle, description: `Agricultorul '${name}' a fost creat cu succes.` });
        setIsAddFarmerDialogOpen(false);
        setTableKey(Date.now());
      } else if (result.errorCode === 'FARMER_EXISTS' && result.id) {
        setFarmerToAssociate({ id: result.id, code: companyCode });
        setIsAddFarmerDialogOpen(false);
        setIsFarmerExistsAlertOpen(true);
      } else {
        throw new Error(result.error || "A apărut o eroare necunoscută.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Eroare", description: error instanceof Error ? error.message : "Ceva nu a funcționat." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExistingFarmerSubmit = async () => {
    if (!existingFarmerCode.trim()) {
      toast({ variant: "destructive", title: t.errorTitle, description: "Codul fiscal este obligatoriu." });
      return;
    }
    setIsSaving(true);
    try {
      const farmer = await getFarmerByCompanyCode(existingFarmerCode.trim());
      if (farmer) {
        setFarmerToAssociate({ id: farmer.id, code: farmer.companyCode });
        setIsAddExistingFarmerDialogOpen(false);
        setIsFarmerExistsAlertOpen(true);
      } else {
        toast({ variant: "destructive", title: "Negăsit", description: t.farmerNotFound });
      }
    } catch (error) {
      toast({ variant: "destructive", title: t.errorTitle, description: error instanceof Error ? error.message : "A apărut o eroare la căutare." });
    } finally {
      setIsSaving(false);
      setExistingFarmerCode('');
    }
  };

  const handleConfirmAssociation = () => {
    if (!farmerToAssociate) return;

    toast({ title: "Acțiune necesară", description: "Veți fi redirecționat pentru a atribui parcele." });

    const params = new URLSearchParams();
    params.set('find_farmer_code', farmerToAssociate.code);

    // Logică robustă pentru contextul satului
    if (selectedVillage) {
      params.set('village_context', selectedVillage);
    } else if (managedVillages.length > 0) {
      params.set('village_context', managedVillages[0]);
    }

    router.push(`/mayor/parcels?${params.toString()}`);
    setIsFarmerExistsAlertOpen(false);
    setFarmerToAssociate(null);
  };

  if (sessionStatus === 'loading' || isContextLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <Card className="shadow-md">
          <CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-1" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (managedVillages.length === 0 && !isContextLoading) {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.errorTitle}</AlertTitle>
          <AlertDescription>{t.noVillagesManagedError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {t.pageTitle}</CardTitle>
            <CardDescription>{pageDescription}</CardDescription>
          </div>
          <div className="flex gap-2 self-end sm:self-center">
            <Button size="sm" className="gap-1" onClick={() => setIsAddExistingFarmerDialogOpen(true)} variant="outline">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{t.addExistingFarmerButton}</span>
            </Button>
            <Button size="sm" className="gap-1" onClick={() => { resetAddFarmerForm(); setIsAddFarmerDialogOpen(true); }}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{t.addFarmerButton}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <FarmerTable
              key={tableKey}
              actorId={session?.user?.id || "mayor_unknown"}
              actorRole="mayor"
              villageFilter={selectedVillage}
              managedVillagesForMayor={managedVillages}
            />
          </Suspense>
        </CardContent>
      </Card>

      {/* Dialog pentru adăugare fermier NOU */}
      <Dialog open={isAddFarmerDialogOpen} onOpenChange={(open) => { if (!open) resetAddFarmerForm(); setIsAddFarmerDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddFarmerSubmit}>
            <DialogHeader>
              <DialogTitle>{t.addDialogTitle}</DialogTitle>
              <DialogDescription>{addDialogDescription}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-farmer-name" className="text-right">{t.nameLabel}</Label>
                <Input id="add-farmer-name" value={newFarmerData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="col-span-3" placeholder={t.namePlaceholder} disabled={isSaving} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-farmer-code" className="text-right">{t.companyCodeLabel}</Label>
                <Input id="add-farmer-code" value={newFarmerData.companyCode} onChange={(e) => handleInputChange('companyCode', e.target.value)} className="col-span-3" placeholder={t.companyCodePlaceholder} disabled={isSaving} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-farmer-village" className="text-right">{t.villageLabel}</Label>
                {managedVillages.length === 1 ? (
                  <Input id="add-farmer-village-display" value={managedVillages[0]} className="col-span-3" disabled={true} />
                ) : (
                  <Select value={newFarmerData.village} onValueChange={(value) => handleInputChange('village', value)} disabled={isSaving} required>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder={t.villagePlaceholder} /></SelectTrigger>
                    <SelectContent>
                      {managedVillages.map(village => <SelectItem key={village} value={village}>{village}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-farmer-email" className="text-right">{t.emailLabel}</Label>
                <Input id="add-farmer-email" type="email" value={newFarmerData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="col-span-3" placeholder={t.emailPlaceholder} disabled={isSaving} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-farmer-phone" className="text-right">{t.phoneLabel}</Label>
                <Input id="add-farmer-phone" type="tel" value={newFarmerData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="col-span-3" placeholder={t.phonePlaceholder} disabled={isSaving} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-farmer-password" className="text-right">{t.passwordLabel}</Label>
                <Input id="add-farmer-password" type="password" value={newFarmerData.password} onChange={(e) => handleInputChange('password', e.target.value)} className="col-span-3" placeholder={t.passwordPlaceholder} disabled={isSaving} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-farmer-color" className="text-right">{t.colorLabel}</Label>
                <Input id="add-farmer-color" type="color" value={newFarmerData.color} onChange={(e) => handleInputChange('color', e.target.value)} className="col-span-2 h-10 p-1" disabled={isSaving} />
                <span className="col-span-1 text-xs text-muted-foreground">{t.colorInputHelper}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddFarmerDialogOpen(false)} disabled={isSaving}>{t.cancelButton}</Button>
              <Button type="submit" disabled={isSaving || !newFarmerData.name || !newFarmerData.companyCode || !newFarmerData.village || newFarmerData.password.length < 8}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? t.savingButton : t.saveButton}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru adăugare fermier EXISTENT */}
      <Dialog open={isAddExistingFarmerDialogOpen} onOpenChange={setIsAddExistingFarmerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.addExistingDialogTitle}</DialogTitle>
            <DialogDescription>{t.addExistingDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="existing-farmer-code" className="text-right">{t.companyCodeLabel}</Label>
              <Input id="existing-farmer-code" value={existingFarmerCode} onChange={e => setExistingFarmerCode(e.target.value)} className="col-span-3" placeholder={t.companyCodePlaceholder} disabled={isSaving} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddExistingFarmerDialogOpen(false)} disabled={isSaving}>{t.cancelButton}</Button>
            <Button onClick={handleAddExistingFarmerSubmit} disabled={isSaving || !existingFarmerCode.trim()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {t.searchButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog pentru confirmarea asocierii */}
      <AlertDialog open={isFarmerExistsAlertOpen} onOpenChange={setIsFarmerExistsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.farmerExistsTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.farmerExistsDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFarmerToAssociate(null)}>{t.cancelButton}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAssociation}>{t.confirmAssociationButton}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
