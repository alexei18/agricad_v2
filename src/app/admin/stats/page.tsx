'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartHorizontal, AlertCircle, PieChart, Users, MapPin } from 'lucide-react'; // Loader2 a fost eliminat că nu e folosit direct aici
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { getAllParcels, Parcel } from '@/services/parcels';
import { getAllFarmers, Farmer } from '@/services/farmers';
import { getAllMayors, Mayor } from '@/services/mayors';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Pie, Cell, ResponsiveContainer } from 'recharts';

interface VillageStats {
  village: string;
  parcelCount: number;
  totalArea: number;
  farmerCount: number;
}

interface MayorStatusStats {
  status: Mayor['subscriptionStatus'];
  count: number;
}

const COLORS = {
  active: 'hsl(var(--chart-1))',
  inactive: 'hsl(var(--chart-4))',
  pending: 'hsl(var(--chart-3))',
};

export default function AdminStatsPage() {
  const tS = { // Am redenumit in tS (textsStats) ca sa nu interfereze cu un eventual 't' din i18n
    pageTitle: "Statistici globale",
    pageDescription: "Prezentare generală agregată a datelor funciare, distribuției agricultorilor și stării primarilor în toate satele.",
    loadingErrorTitle: "Eroare la încărcarea statisticilor",
    parcelsPerVillageTitle: "Parcele per sat",
    farmersPerVillageTitle: "Agricultori per sat",
    totalAreaPerVillageTitle: "Suprafață totală per sat (ha)",
    mayorStatusTitle: "Stare abonament primari",
    failedToLoadStats: "Nu s-au putut încărca statisticile." // Mesaj nou
  };

  const [villageStats, setVillageStats] = React.useState<VillageStats[]>([]);
  const [mayorStatusStats, setMayorStatusStats] = React.useState<MayorStatusStats[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [parcelsData, farmersData, mayorsData] = await Promise.all([
          getAllParcels(),
          getAllFarmers(),
          getAllMayors(),
        ]);

        const villageMap = new Map<string, VillageStats>();

        parcelsData.forEach(parcel => {
          let stats = villageMap.get(parcel.village);
          if (!stats) {
            stats = { village: parcel.village, parcelCount: 0, totalArea: 0, farmerCount: 0 };
            villageMap.set(parcel.village, stats);
          }
          stats.parcelCount++;
          stats.totalArea += parcel.area;
        });

        // Procesare `farmer.villages` (presupunând că este un JSON string cu un array de sate)
        farmersData.forEach(farmer => {
          let farmerActualVillages: string[] = [];
          if (typeof farmer.villages === 'string') {
            try {
              farmerActualVillages = JSON.parse(farmer.villages);
            } catch (e) {
              console.error(`Failed to parse villages JSON for farmer ${farmer.id}: ${farmer.villages}`, e);
              // Dacă parsarea eșuează, putem considera `farmer.village` (dacă există) sau skip
              if (typeof (farmer as any).village === 'string') { // Fallback la structura veche
                farmerActualVillages = [(farmer as any).village];
              }
            }
          } else if (Array.isArray(farmer.villages)) { // Dacă e deja array
            farmerActualVillages = farmer.villages;
          }


          farmerActualVillages.forEach(villageName => {
            let stats = villageMap.get(villageName);
            if (stats) {
              stats.farmerCount++;
            } else {
              // Acest caz ar putea indica un fermier asociat cu un sat fără parcele (încă)
              // Sau un sat care nu a fost găsit în `parcelsData`
              stats = { village: villageName, parcelCount: 0, totalArea: 0, farmerCount: 1 };
              villageMap.set(villageName, stats);
            }
          });
        });

        setVillageStats(Array.from(villageMap.values()).sort((a, b) => a.village.localeCompare(b.village)));

        const statusMap = new Map<Mayor['subscriptionStatus'], number>();
        mayorsData.forEach(mayor => {
          statusMap.set(mayor.subscriptionStatus, (statusMap.get(mayor.subscriptionStatus) || 0) + 1);
        });

        const processedMayorStats = Array.from(statusMap.entries()).map(([status, count]) => ({
          status,
          count
        }));
        setMayorStatusStats(processedMayorStats);

      } catch (err) {
        console.error("Error fetching global statistics:", err);
        setError(err instanceof Error ? err.message : tS.failedToLoadStats);
        setVillageStats([]);
        setMayorStatusStats([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tS.failedToLoadStats]); // Adăugat tS.failedToLoadStats la dependențe

  const renderLoading = () => (
    <div className="grid gap-6 md:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderError = () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{tS.loadingErrorTitle}</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  const chartConfig = {
    count: { label: "Număr" },
    area: { label: "Suprafață (ha)" },
    village: { label: "Sat" },
    status: { label: "Status" }, // Păstrat "Status", e comun
    farmers: { label: "Agricultori", color: "hsl(var(--chart-2))" },
    parcels: { label: "Parcele", color: "hsl(var(--chart-1))" },
    totalArea: { label: "Suprafață totală (ha)", color: "hsl(var(--chart-3))" },
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartHorizontal className="h-5 w-5" />
            {tS.pageTitle}
          </CardTitle>
          <CardDescription>
            {tS.pageDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? renderLoading() : error ? renderError() : (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-1"><MapPin className="h-4 w-4" /> {tS.parcelsPerVillageTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={villageStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" dataKey="parcelCount" />
                        <YAxis dataKey="village" type="category" width={80} tick={{ fontSize: 12 }} interval={0} />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="parcelCount" fill="var(--color-parcels)" radius={4} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-1"><Users className="h-4 w-4" /> {tS.farmersPerVillageTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={villageStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" dataKey="farmerCount" />
                        <YAxis dataKey="village" type="category" width={80} tick={{ fontSize: 12 }} interval={0} />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="farmerCount" fill="var(--color-farmers)" radius={4} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-1"><BarChartHorizontal className="h-4 w-4" /> {tS.totalAreaPerVillageTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={villageStats} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" dataKey="totalArea" tickFormatter={(value) => value.toFixed(1)} />
                        <YAxis dataKey="village" type="category" width={80} tick={{ fontSize: 12 }} interval={0} />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="totalArea" fill="var(--color-totalArea)" radius={4} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-1"><PieChart className="h-4 w-4" /> {tS.mayorStatusTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={mayorStatusStats}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={60}
                          paddingAngle={5}
                          labelLine={false}
                        >
                          {mayorStatusStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS] || '#8884d8'} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}