// --- START OF FILE app/admin/parcels/components/parcel-upload-form.tsx ---
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { uploadParcelsAction } from '../actions';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

const FileSchema = z.custom<File>((val): val is File => val instanceof File, {
  message: 'Vă rugăm să selectați un fișier.',
})
  .refine(file => !!file && file.size <= MAX_FILE_SIZE, `Dimensiunea maximă a fișierului este 5MB.`) // Adăugat !!file
  .refine(
    file => !!file && (ACCEPTED_FILE_TYPES.some(type => file.type.startsWith(type)) || file.type === '' || file.type === 'text/plain'), // Adăugat !!file
    "Sunt acceptate doar fișiere .csv."
  );

const formSchema = z.object({
  parcelFile: FileSchema.nullable().optional(), // Permite null/undefined inițial
});

type FormData = z.infer<typeof formSchema>;

export function ParcelUploadForm() {
  const t = {
    formLabel: "Fișier date parcele (.csv)",
    formDescription: 'Încărcați un fișier CSV cu coloanele: parcel_id (text), area_hectares (număr), projected_polygon (text "POLYGON((X Y,...))" în proiecție locală), village (text). Dimensiune maximă: 5MB.',
    uploadButton: "Încarcă/Actualizează parcele",
    uploadingButton: "Se încarcă...",
    successTitle: "Succes",
    successDescription: (count: number | undefined) => `Fișierul a fost procesat. ${count ?? 0} parcele procesate/actualizate.`,
    validationErrorTitle: "Eroare de validare",
    uploadErrorTitle: "Eroare la încărcarea parcelelor",
    validationErrorDesc: "Verificați erorile detaliate mai jos sau în consola browserului.",
    unknownErrorDesc: "A apărut o eroare necunoscută. Verificați consola pentru detalii.",
    uploadFailedTitle: "Încărcare eșuată",
    clientErrorDesc: "A apărut o eroare neașteptată pe client. Verificați consola.",
    validationDetailsTitle: "Detalii eroare validare",
    invalidFileObject: "Obiect de fișier invalid. Vă rugăm să selectați din nou un fișier.",
    noFileSelected: "Vă rugăm să selectați un fișier."
  };

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadErrorDetails, setUploadErrorDetails] = React.useState<string[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null); // Tip corectat

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parcelFile: undefined,
    },
    mode: 'onChange',
  });

  async function onSubmit(data: FormData) {
    setUploadErrorDetails(null);

    if (!data.parcelFile || !(data.parcelFile instanceof File)) {
      form.setError("parcelFile", { type: "manual", message: t.noFileSelected });
      console.error("Form submitted without a valid File object:", data.parcelFile);
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('parcelFile', data.parcelFile);

    try {
      const result = await uploadParcelsAction(formData);

      if (result.success) {
        toast({
          title: t.successTitle,
          description: t.successDescription(result.processedCount),
        });
        form.reset({ parcelFile: undefined }); // Resetează formularul
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Curăță valoarea inputului de fișier
        }
      } else {
        if (result.errorDetails && result.errorDetails.length > 0) {
          setUploadErrorDetails(result.errorDetails);
          toast({
            title: t.validationErrorTitle,
            description: result.message || t.validationErrorDesc,
            variant: 'destructive',
            duration: 10000,
          });
        } else {
          toast({
            title: t.uploadErrorTitle,
            description: result.message || t.unknownErrorDesc,
            variant: 'destructive',
          });
        }
        console.error('Server action failed:', result.message, result.errorDetails, result.error);
      }
    } catch (error) {
      console.error('Upload submission error (client-side catch):', error);
      toast({
        title: t.uploadFailedTitle,
        description: error instanceof Error ? error.message : t.clientErrorDesc,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="parcelFile"
          render={({ field: { onChange, onBlur, name, ref: rhfRef } }) => (
            <FormItem>
              <FormLabel htmlFor={name}>{t.formLabel}</FormLabel>
              <FormControl>
                <Input
                  id={name}
                  type="file"
                  accept=".csv, text/csv, application/vnd.ms-excel, text/plain"
                  onBlur={onBlur}
                  name={name}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    onChange(file ?? null); // Pasează fișierul sau null
                    setUploadErrorDetails(null);
                  }}
                  ref={(instance) => {
                    rhfRef(instance as HTMLInputElement | null); // Cast la tipul corect
                    if (instance) {
                      fileInputRef.current = instance;
                    }
                  }}
                  className="file:text-primary file:font-medium"
                />
              </FormControl>
              <FormDescription>
                {t.formDescription}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {uploadErrorDetails && (
          <Alert variant="destructive" className="max-h-60 overflow-y-auto">
            <AlertTitle>{t.validationDetailsTitle}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                {uploadErrorDetails.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isSubmitting || !form.formState.isValid || !form.getValues("parcelFile")}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? t.uploadingButton : t.uploadButton}
        </Button>
      </form>
    </Form>
  );
}
