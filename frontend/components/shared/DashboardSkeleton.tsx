import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function StatCardSkeleton() {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="w-10 h-10 rounded-lg" />
                </div>
            </CardContent>
        </Card>
    );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
    return (
        <tr className="border-b">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="p-4">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
            ))}
        </tr>
    );
}

export function AdminDashboardSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-56" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                </CardHeader>
                <div className="px-6 pb-6 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-2">
                            <Skeleton className="w-9 h-11 rounded" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

export function StudentDashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>

            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <div className="px-6 pb-6 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                            <Skeleton className="w-10 h-12 rounded" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

export function BooksTableSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <Skeleton className="h-9 w-28 rounded-lg" />
            </div>

            <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="pt-5 pb-4">
                            <Skeleton className="h-3 w-24 mb-2" />
                            <Skeleton className="h-8 w-12" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <Skeleton className="h-9 w-72 rounded-lg" />
                </CardHeader>
                <div className="px-6 pb-4">
                    <table className="w-full">
                        <tbody>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <TableRowSkeleton key={i} cols={6} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

export function StudentLoansSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-1">
                    <Skeleton className="h-7 w-28" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>

            <div className="border rounded-xl p-6 space-y-4">
                <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-12 w-full rounded-lg" />
            </div>

            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <Skeleton className="w-12 h-16 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-32" />
                                <div className="flex gap-4 pt-1">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-4 w-36" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function LoansTableSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <Skeleton className="h-9 w-28 rounded-lg" />
            </div>

            <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex gap-2 mb-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-8 w-24 rounded-md" />
                        ))}
                    </div>
                    <Skeleton className="h-9 w-full rounded-lg" />
                </CardHeader>
                <div className="px-6 pb-4">
                    <table className="w-full">
                        <tbody>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <TableRowSkeleton key={i} cols={6} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}