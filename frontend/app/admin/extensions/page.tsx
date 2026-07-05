'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle, XCircle } from 'lucide-react';
import type { LoanExtension } from '@/lib/type';

function statusBadgeClass(status: string) {
    if (status === 'PENDING') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (status === 'APPROVED') return 'bg-green-100 text-green-700 border-green-200';
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

export default function AdminExtensionsPage() {
    const [extensions, setExtensions] = useState<LoanExtension[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending');

    const [approveOpen, setApproveOpen] = useState(false);
    const [approveTarget, setApproveTarget] = useState<LoanExtension | null>(null);
    const [approveLoading, setApproveLoading] = useState(false);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<LoanExtension | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);

    const fetchExtensions = useCallback(async () => {
        try {
            const { data } = await api.get('/extensions');
            if (data.success) {
                setExtensions(data.extensions);
                setPendingCount(data.pendingCount ?? 0);
            }
        } catch {
            toast.error('Failed to load extension requests');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchExtensions(); }, [fetchExtensions]);

    const openApprove = (ext: LoanExtension) => {
        setApproveTarget(ext);
        setApproveOpen(true);
    };

    const openReject = (ext: LoanExtension) => {
        setRejectTarget(ext);
        setRejectReason('');
        setRejectOpen(true);
    };

    const handleApprove = async () => {
        if (!approveTarget) return;
        setApproveLoading(true);
        try {
            await api.patch(`/extensions/${approveTarget.id}/approve`, {});
            await fetchExtensions();
            setApproveOpen(false);
            toast.success(`Extension for "${approveTarget.loan?.book?.title}" approved`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to approve extension');
        } finally {
            setApproveLoading(false);
        }
    };

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectTarget) return;
        setRejectLoading(true);
        try {
            await api.patch(`/extensions/${rejectTarget.id}/reject`, { adminNote: rejectReason });
            await fetchExtensions();
            setRejectOpen(false);
            toast.success(`Extension for "${rejectTarget.loan?.book?.title}" rejected`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to reject extension');
        } finally {
            setRejectLoading(false);
        }
    };

    const filterByTab = (t: string) => {
        if (t === 'all') return extensions;
        return extensions.filter(e => e.status === t.toUpperCase());
    };

    const ExtensionsTable = ({ list }: { list: LoanExtension[] }) => {
        if (list.length === 0) return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                    <CalendarClock className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">No extension requests found</p>
            </div>
        );

        return (
            <Table className="table-fixed">
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-1/5">Student</TableHead>
                        <TableHead className="w-1/4">Book</TableHead>
                        <TableHead className="w-1/6">New Due Date</TableHead>
                        <TableHead className="w-1/6">Requested</TableHead>
                        <TableHead className="w-1/6">Status</TableHead>
                        <TableHead className="w-1/6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.map((ext) => (
                        <TableRow key={ext.id}>
                            <TableCell>
                                <p className="text-sm font-medium truncate">{ext.student?.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{ext.student?.email}</p>
                            </TableCell>
                            <TableCell>
                                <p className="text-sm font-bold truncate">{ext.loan?.book?.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{ext.loan?.book?.author}</p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(ext.newDueDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(ext.requestedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <Badge className={`${statusBadgeClass(ext.status)} hover:${statusBadgeClass(ext.status)}`}>
                                    {ext.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {ext.status === 'PENDING' ? (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm" variant="outline"
                                            className="gap-1 border-green-300 text-green-700 hover:bg-green-50"
                                            onClick={() => openApprove(ext)}
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm" variant="outline"
                                            className="gap-1 border-red-300 text-red-700 hover:bg-red-50"
                                            onClick={() => openReject(ext)}
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    if (loading) return <PageSkeleton />;

    const pending = extensions.filter(e => e.status === 'PENDING');
    const approved = extensions.filter(e => e.status === 'APPROVED');
    const rejected = extensions.filter(e => e.status === 'REJECTED');

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <CalendarClock className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Loan Extensions</h1>
                        {pendingCount > 0 && (
                            <Badge className="bg-red-500 text-white border-0">{pendingCount}</Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">Review student requests to extend loan due dates</p>
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
                                <TabsTrigger value="approved" className="text-xs cursor-pointer">
                                    Approved <Badge variant="secondary" className="text-xs px-1.5 ml-1">{approved.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="rejected" className="text-xs cursor-pointer">
                                    Rejected <Badge variant="secondary" className="text-xs px-1.5 ml-1">{rejected.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="all" className="text-xs cursor-pointer">
                                    All <Badge variant="secondary" className="text-xs px-1.5 ml-1">{extensions.length}</Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <Separator className="mt-4" />

                        <TabsContent value="pending" className="mt-0"><ExtensionsTable list={filterByTab('pending')} /></TabsContent>
                        <TabsContent value="approved" className="mt-0"><ExtensionsTable list={filterByTab('approved')} /></TabsContent>
                        <TabsContent value="rejected" className="mt-0"><ExtensionsTable list={filterByTab('rejected')} /></TabsContent>
                        <TabsContent value="all" className="mt-0"><ExtensionsTable list={filterByTab('all')} /></TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Approve dialog */}
            <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Extension Request</AlertDialogTitle>
                        <AlertDialogDescription>
                            Approve extension for <strong>{approveTarget?.loan?.book?.title}</strong> requested by{' '}
                            <strong>{approveTarget?.student?.name}</strong>? New due date will be{' '}
                            <strong>{approveTarget && new Date(approveTarget.newDueDate).toLocaleDateString()}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={approveLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleApprove(); }}
                            disabled={approveLoading}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {approveLoading ? 'Approving...' : 'Approve'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject sheet */}
            <Sheet open={rejectOpen} onOpenChange={setRejectOpen}>
                <SheetContent className="sm:max-w-md p-0 gap-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                <XCircle className="w-4 h-4 text-red-600" />
                            </div>
                            Reject Extension Request
                        </SheetTitle>
                        <SheetDescription>Provide a reason that will be shown to the student</SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                        {rejectTarget && (
                            <div className="bg-muted/40 rounded-lg border p-4 space-y-1">
                                <p className="font-semibold text-sm truncate">{rejectTarget.loan?.book?.title}</p>
                                <p className="text-xs text-muted-foreground">Student: {rejectTarget.student?.name}</p>
                            </div>
                        )}

                        <form onSubmit={handleReject} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium" htmlFor="reject-reason">
                                    Reason for Rejection <span className="text-destructive">*</span>
                                </label>
                                <textarea
                                    id="reject-reason"
                                    required
                                    rows={4}
                                    placeholder="Provide a clear reason for rejecting this request..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                                <p className="text-xs text-muted-foreground">Required — shown to the student.</p>
                            </div>

                            <Separator />

                            <div className="flex gap-3">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setRejectOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                    disabled={rejectLoading || rejectReason.trim().length === 0}
                                >
                                    {rejectLoading ? 'Rejecting...' : 'Reject'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
