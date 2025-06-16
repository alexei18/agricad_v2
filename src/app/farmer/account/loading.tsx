// src/app/farmer/account/loading.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FarmerAccountLoading() {
    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <Skeleton className="h-7 w-48 mb-1" /> {/* Pentru titlul paginii */}
                    <Skeleton className="h-4 w-64" /> {/* Pentru descrierea paginii */}
                </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Skeleton pentru cardul de detalii cont */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex justify-between">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                        <Skeleton className="h-8 w-full mt-2" />
                    </CardContent>
                </Card>

                {/* Skeleton pentru cardul de schimbare parolă */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <Skeleton className="h-6 w-2/3 mb-1" />
                        <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Skeleton className="h-4 w-1/4 mb-1.5" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-1/4 mb-1.5" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-1/4 mb-1.5" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-10 w-full mt-2" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}