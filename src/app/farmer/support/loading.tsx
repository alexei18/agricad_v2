// src/app/farmer/support/loading.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FarmerSupportLoading() {
    return (
        <div className="flex-1 p-4 sm:p-6 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <Skeleton className="h-7 w-52 mb-1" /> {/* Pentru titlul paginii */}
                    <Skeleton className="h-4 w-72" /> {/* Pentru descrierea paginii */}
                </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-5 w-1/2" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i}>
                            <Skeleton className="h-5 w-3/4 mb-1" />
                            <Skeleton className="h-4 w-full" />
                            {i < 2 && <Skeleton className="h-px w-full my-3 bg-muted" />}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}