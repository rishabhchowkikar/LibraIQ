'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
import { BookMarked, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import type { BookRequest } from '@/lib/type';

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

export default function AdminBookRequestsPage() {
    const [requests, setRequests] = useState<BookRequest[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending');

    const [approveOpen, setApproveOpen] = useState(false);
    const [approveTarget, setApproveTarget] = useState<BookRequest | null>(null);
    const [approveNote, setApproveNote] = useState('');
    const [approveLoading, setApproveLoading] = useState(false);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<BookRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);

    const [viewOpen, setViewOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState<BookRequest | null>(null);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/book-requests');
            if (data.success) {
                setRequests(data.requests);
                setPendingCount(data.pendingCount ?? data.requests.filter((r: BookRequest) => r.status === 'PENDING').length);
            }
        } catch {
            toast.error('Failed to load book requests');
        } finally {
            setLoading(false);
        }
    };

    const openApprove = (req: BookRequest) => {
        setApproveTarget(req);
        setApproveNote('');
        setApproveOpen(true);
    };

    const openReject = (req: BookRequest) => {
        setRejectTarget(req);
        setRejectReason('');
        setRejectOpen(true);
    };

    const openView = (req: BookRequest) => {
        setViewTarget(req);
        setViewOpen(true);
    };

    const handleApprove = async () => {
        if (!approveTarget) return;
        setApproveLoading(true);
        try {
            await api.patch(`/book-requests/${approveTarget.id}/approve`, { adminNote: approveNote || undefined });
            await fetchRequests();
            setApproveOpen(false);
            toast.success(`Request for "${approveTarget.title}" approved`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to approve request');
        } finally {
            setApproveLoading(false);
        }
    };

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectTarget) return;
        setRejectLoading(true);
        try {
            await api.patch(`/book-requests/${rejectTarget.id}/reject`, { adminNote: rejectReason });
            await fetchRequests();
            setRejectOpen(false);
            toast.success(`Request for "${rejectTarget.title}" rejected`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to reject request');
        } finally {
            setRejectLoading(false);
        }
    };

    const filterByTab = (t: string) => {
        if (t === 'all') return requests;
        return requests.filter(r => r.status === t.toUpperCase());
    };

    const RequestsTable = ({ list }: { list: BookRequest[] }) => {
        if (list.length === 0) return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                    <BookMarked className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">No requests found</p>
            </div>
        );

        return (
            <Table className="table-fixed">
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-1/6">Student</TableHead>
                        <TableHead className="w-1/4">Book</TableHead>
                        <TableHead className="w-1/12">Genre</TableHead>
                        <TableHead className="w-1/4">Reason</TableHead>
                        <TableHead className="w-1/8">Submitted</TableHead>
                        <TableHead className="w-1/8">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.map((req) => (
                        <TableRow
                            key={req.id}
                            onClick={() => openView(req)}
                            className="cursor-pointer"
                        >
                            <TableCell>
                                <p className="text-sm font-medium truncate">{req.student.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{req.student.email}</p>
                            </TableCell>
                            <TableCell>
                                <p className="text-sm font-bold truncate">{req.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{req.author}</p>
                            </TableCell>
                            <TableCell>
                                {req.genre ? <Badge variant="secondary" className="text-xs">{req.genre}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell>
                                {req.reason ? (
                                    <span className="text-sm text-muted-foreground truncate block">
                                        {req.reason}
                                    </span>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(req.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <Badge className={`${statusBadgeClass(req.status)} hover:${statusBadgeClass(req.status)}`}>
                                    {req.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    if (loading) return <PageSkeleton />;

    const pending = requests.filter(r => r.status === 'PENDING');
    const approved = requests.filter(r => r.status === 'APPROVED');
    const rejected = requests.filter(r => r.status === 'REJECTED');

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <BookMarked className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Book Requests</h1>
                        {pendingCount > 0 && (
                            <Badge className="bg-red-500 text-white border-0">{pendingCount}</Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">Review student book requests</p>
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
                                    All <Badge variant="secondary" className="text-xs px-1.5 ml-1">{requests.length}</Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <Separator className="mt-4" />

                        <TabsContent value="pending" className="mt-0"><RequestsTable list={filterByTab('pending')} /></TabsContent>
                        <TabsContent value="approved" className="mt-0"><RequestsTable list={filterByTab('approved')} /></TabsContent>
                        <TabsContent value="rejected" className="mt-0"><RequestsTable list={filterByTab('rejected')} /></TabsContent>
                        <TabsContent value="all" className="mt-0"><RequestsTable list={filterByTab('all')} /></TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Approve dialog */}
            <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Book Request</AlertDialogTitle>
                        <AlertDialogDescription>
                            Approve <strong>{approveTarget?.title}</strong> requested by <strong>{approveTarget?.student.name}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="approve-note">Note (optional)</Label>
                        <Input
                            id="approve-note"
                            placeholder="e.g. Ordered, will arrive next week"
                            value={approveNote}
                            onChange={(e) => setApproveNote(e.target.value)}
                        />
                    </div>

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
                            Reject Book Request
                        </SheetTitle>
                        <SheetDescription>Provide a reason that will be shown to the student</SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                        {rejectTarget && (
                            <div className="bg-muted/40 rounded-lg border p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-11 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                                        <BookOpen className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm truncate">{rejectTarget.title}</p>
                                        <p className="text-xs text-muted-foreground">Student: {rejectTarget.student.name}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleReject} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reject-reason">
                                    Reason for Rejection <span className="text-destructive">*</span>
                                </Label>
                                <textarea
                                    id="reject-reason"
                                    required
                                    rows={4}
                                    placeholder="Provide a clear reason for rejecting this request..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                                <p className="text-xs text-muted-foreground">Minimum 5 characters required.</p>
                            </div>

                            <Separator />

                            <div className="flex gap-3">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setRejectOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                    disabled={rejectLoading || rejectReason.trim().length < 5}
                                >
                                    {rejectLoading ? 'Rejecting...' : 'Reject'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>

            {/* View details sheet */}
            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <SheetContent className="sm:max-w-md p-0 gap-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-primary" />
                            </div>
                            Request Details
                        </SheetTitle>
                        <SheetDescription>Full details of this book request</SheetDescription>
                    </SheetHeader>

                    {viewTarget && (
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                            <div className="bg-muted/40 rounded-lg border p-4 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Book</p>
                                <p className="font-bold text-sm wrap-break-word">{viewTarget.title}</p>
                                <p className="text-sm text-muted-foreground">{viewTarget.author}</p>
                                {viewTarget.genre && <Badge variant="secondary" className="text-xs">{viewTarget.genre}</Badge>}
                            </div>

                            <div className="bg-muted/40 rounded-lg border p-4 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Student</p>
                                <p className="text-sm font-medium">{viewTarget.student.name}</p>
                                <p className="text-xs text-muted-foreground">{viewTarget.student.email}</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</p>
                                <p className="text-sm text-muted-foreground wrap-break-word">
                                    {viewTarget.reason || '—'}
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge className={`${statusBadgeClass(viewTarget.status)} hover:${statusBadgeClass(viewTarget.status)}`}>
                                        {viewTarget.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Submitted</span>
                                    <span>{new Date(viewTarget.createdAt).toLocaleDateString()}</span>
                                </div>
                                {viewTarget.reviewedAt && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Reviewed</span>
                                        <span>{new Date(viewTarget.reviewedAt).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            {viewTarget.adminNote && (
                                <blockquote className={`rounded-md px-3 py-2 text-sm border ${viewTarget.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                                    {viewTarget.status === 'REJECTED' ? 'Reason: ' : 'Admin note: '}{viewTarget.adminNote}
                                </blockquote>
                            )}

                            {viewTarget.status === 'PENDING' && (
                                <>
                                    <Separator />
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                                            onClick={() => { setViewOpen(false); openApprove(viewTarget); }}
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                                            onClick={() => { setViewOpen(false); openReject(viewTarget); }}
                                        >
                                            <XCircle className="w-3.5 h-3.5" /> Reject
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
