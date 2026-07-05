'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { BookMarked } from 'lucide-react';
import type { Reservation } from '@/lib/type';

function statusBadgeClass(status: string) {
    if (status === 'PENDING') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (status === 'NOTIFIED') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'FULFILLED') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (status === 'EXPIRED') return 'bg-muted text-muted-foreground border-border';
    return 'bg-red-100 text-red-700 border-red-200';
}

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <Card><CardContent className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </CardContent></Card>
        </div>
    );
}

export default function AdminReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending');

    const fetchReservations = useCallback(async () => {
        try {
            const { data } = await api.get('/reservations');
            if (data.success) setReservations(data.reservations);
        } catch {
            toast.error('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReservations(); }, [fetchReservations]);

    const filterByTab = (t: string) => {
        if (t === 'all') return reservations;
        return reservations.filter(r => r.status === t.toUpperCase());
    };

    const ReservationsTable = ({ list }: { list: Reservation[] }) => {
        if (list.length === 0) return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                    <BookMarked className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">No reservations found</p>
            </div>
        );

        return (
            <Table className="table-fixed">
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-1/5">Student</TableHead>
                        <TableHead className="w-1/4">Book</TableHead>
                        <TableHead className="w-1/6">Reserved</TableHead>
                        <TableHead className="w-1/6">Expires</TableHead>
                        <TableHead className="w-1/6">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.map((res) => (
                        <TableRow key={res.id}>
                            <TableCell>
                                <p className="text-sm font-medium truncate">{res.student?.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{res.student?.email}</p>
                            </TableCell>
                            <TableCell>
                                <p className="text-sm font-bold truncate">{res.book?.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{res.book?.author}</p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(res.reservedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(res.expiresAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <Badge className={`${statusBadgeClass(res.status)} hover:${statusBadgeClass(res.status)}`}>
                                    {res.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    if (loading) return <PageSkeleton />;

    const pending = reservations.filter(r => r.status === 'PENDING');
    const notified = reservations.filter(r => r.status === 'NOTIFIED');

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <BookMarked className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
                        {pending.length > 0 && (
                            <Badge className="bg-red-500 text-white border-0">{pending.length}</Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">Book reservation queue across all students</p>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Tabs value={tab} onValueChange={setTab}>
                        <div className="px-6 pt-4">
                            <TabsList>
                                <TabsTrigger value="pending" className="gap-1.5 text-xs cursor-pointer">
                                    Pending
                                    {pending.length > 0 && (
                                        <Badge className="text-xs px-1.5 bg-red-100 text-red-700 border-0">{pending.length}</Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="notified" className="text-xs cursor-pointer">
                                    Notified <Badge variant="secondary" className="text-xs px-1.5 ml-1">{notified.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="fulfilled" className="text-xs cursor-pointer">Fulfilled</TabsTrigger>
                                <TabsTrigger value="expired" className="text-xs cursor-pointer">Expired</TabsTrigger>
                                <TabsTrigger value="cancelled" className="text-xs cursor-pointer">Cancelled</TabsTrigger>
                                <TabsTrigger value="all" className="text-xs cursor-pointer">
                                    All <Badge variant="secondary" className="text-xs px-1.5 ml-1">{reservations.length}</Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <Separator className="mt-4" />

                        <TabsContent value="pending" className="mt-0"><ReservationsTable list={filterByTab('pending')} /></TabsContent>
                        <TabsContent value="notified" className="mt-0"><ReservationsTable list={filterByTab('notified')} /></TabsContent>
                        <TabsContent value="fulfilled" className="mt-0"><ReservationsTable list={filterByTab('fulfilled')} /></TabsContent>
                        <TabsContent value="expired" className="mt-0"><ReservationsTable list={filterByTab('expired')} /></TabsContent>
                        <TabsContent value="cancelled" className="mt-0"><ReservationsTable list={filterByTab('cancelled')} /></TabsContent>
                        <TabsContent value="all" className="mt-0"><ReservationsTable list={filterByTab('all')} /></TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
