'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Sheet, SheetContent, SheetHeader,
    SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
    Receipt, Search, CheckCircle2, ShieldCheck,
    AlertCircle, BookOpen, IndianRupee, TrendingDown,
} from 'lucide-react';

interface Fine {
    id: string;
    amount: number;
    reason: string;
    paidAt: string | null;
    waivedBy: string | null;
    createdAt: string;
    student: { id: string; name: string; email: string; trustTier: string };
    loan: { book: { title: string; author: string } };
}

interface Summary {
    total: number;
    unpaidCount: number;
    totalOutstanding: number;
    totalCollected: number;
}

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-44" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}><CardContent className="pt-5 pb-4">
                        <Skeleton className="h-3 w-24 mb-2" /><Skeleton className="h-8 w-16" />
                    </CardContent></Card>
                ))}
            </div>
        </div>
    );
}

export default function AdminFinesPage() {
    const [fines, setFines] = useState<Fine[]>([]);
    const [summary, setSummary] = useState<Summary>({
        total: 0, unpaidCount: 0, totalOutstanding: 0, totalCollected: 0,
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Waive sheet
    const [waiveOpen, setWaiveOpen] = useState(false);
    const [waivingFine, setWaivingFine] = useState<Fine | null>(null);
    const [waiveReason, setWaiveReason] = useState('');
    const [waiveLoading, setWaiveLoading] = useState(false);
    const [waiveError, setWaiveError] = useState('');

    useEffect(() => { fetchFines(); }, []);

    const fetchFines = async () => {
        try {
            const { data } = await api.get('/fines');
            if (data.success) {
                setFines(data.fines);
                setSummary(data.summary);
            }
        } catch {
            toast.error('Failed to load fines');
        } finally {
            setLoading(false);
        }
    };

    const filterFines = (status?: string) => {
        const q = search.toLowerCase();
        return fines.filter(f => {
            const matchSearch =
                f.student.name.toLowerCase().includes(q) ||
                f.loan.book.title.toLowerCase().includes(q) ||
                f.student.email.toLowerCase().includes(q);
            if (!matchSearch) return false;
            if (!status) return true;
            if (status === 'unpaid') return !f.paidAt && !f.waivedBy;
            if (status === 'paid') return !!f.paidAt;
            if (status === 'waived') return !!f.waivedBy;
            return true;
        });
    };

    const handlePay = async (fine: Fine) => {
        try {
            await api.post(`/fines/${fine.id}/pay`);
            await fetchFines();
            toast.success(`Fine of ₹${fine.amount} marked as paid`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to mark as paid');
        }
    };

    const openWaive = (fine: Fine) => {
        setWaivingFine(fine);
        setWaiveReason('');
        setWaiveError('');
        setWaiveOpen(true);
    };

    const handleWaive = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!waivingFine) return;
        setWaiveError('');
        setWaiveLoading(true);
        try {
            await api.post(`/fines/${waivingFine.id}/waive`, { reason: waiveReason });
            await fetchFines();
            setWaiveOpen(false);
            toast.success(`Fine of ₹${waivingFine.amount} waived successfully`);
        } catch (err: any) {
            setWaiveError(err.response?.data?.error || 'Failed to waive fine');
        } finally {
            setWaiveLoading(false);
        }
    };

    const getStatusBadge = (fine: Fine) => {
        if (fine.paidAt) return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 gap-1"><CheckCircle2 className="w-3 h-3" />Paid</Badge>;
        if (fine.waivedBy) return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1"><ShieldCheck className="w-3 h-3" />Waived</Badge>;
        return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1"><AlertCircle className="w-3 h-3" />Unpaid</Badge>;
    };

    const FineTable = ({ list }: { list: Fine[] }) => {
        if (list.length === 0) return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Receipt className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">No fines found</p>
            </div>
        );

        return (
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Student</TableHead>
                        <TableHead>Book</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.map((fine) => {
                        const isUnpaid = !fine.paidAt && !fine.waivedBy;
                        return (
                            <TableRow key={fine.id} className="group">
                                <TableCell>
                                    <p className="font-medium text-sm">{fine.student.name}</p>
                                    <p className="text-xs text-muted-foreground">{fine.student.email}</p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-10 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate max-w-[140px]">
                                                {fine.loan.book.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{fine.loan.book.author}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm text-muted-foreground max-w-[160px] truncate">
                                        {fine.reason?.split('| Waived:')[0].trim()}
                                    </p>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`font-bold text-base ${isUnpaid ? 'text-red-600' : 'text-foreground'}`}>
                                        ₹{fine.amount}
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(fine.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{getStatusBadge(fine)}</TableCell>
                                <TableCell className="text-right">
                                    {isUnpaid && (
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePay(fine)}
                                                className="h-7 text-xs gap-1 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                                            >
                                                <CheckCircle2 className="w-3 h-3" />
                                                Paid
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openWaive(fine)}
                                                className="h-7 text-xs gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                                            >
                                                <ShieldCheck className="w-3 h-3" />
                                                Waive
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        );
    };

    if (loading) return <PageSkeleton />;

    const unpaidFines = fines.filter(f => !f.paidAt && !f.waivedBy);

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <Receipt className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fines Management</h1>
                    <p className="text-sm text-muted-foreground">Manage library fines and payments</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Fines', value: summary.total, color: 'text-foreground' },
                    { label: 'Outstanding', value: `₹${summary.totalOutstanding}`, color: 'text-red-600', sub: `${summary.unpaidCount} unpaid` },
                    { label: 'Collected', value: `₹${summary.totalCollected}`, color: 'text-green-600' },
                    { label: 'Waived', value: `₹${fines.filter(f => f.waivedBy).reduce((s, f) => s + f.amount, 0)}`, color: 'text-blue-600' },
                ].map(stat => (
                    <Card key={stat.label} className="shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                            {stat.sub && <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Outstanding Alert */}
            {summary.unpaidCount > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">
                        <strong>{summary.unpaidCount} student{summary.unpaidCount > 1 ? 's have' : ' has'}</strong> unpaid fines
                        totalling <strong>₹{summary.totalOutstanding}</strong>.
                        Their accounts are blocked from new loans.
                    </p>
                </div>
            )}

            {/* Fines Table */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by student or book..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>

                <Separator />

                <Tabs defaultValue="unpaid">
                    <div className="px-6 pt-4">
                        <TabsList>
                            <TabsTrigger value="unpaid" className="gap-1.5 text-xs">
                                Unpaid
                                {unpaidFines.length > 0 && (
                                    <Badge className="text-xs px-1.5 bg-red-100 text-red-700 border-0">
                                        {unpaidFines.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="paid" className="text-xs">
                                Paid <Badge variant="secondary" className="text-xs px-1.5 ml-1">{fines.filter(f => f.paidAt).length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="waived" className="text-xs">
                                Waived <Badge variant="secondary" className="text-xs px-1.5 ml-1">{fines.filter(f => f.waivedBy).length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="all" className="text-xs">
                                All <Badge variant="secondary" className="text-xs px-1.5 ml-1">{fines.length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="unpaid" className="mt-0">
                        <FineTable list={filterFines('unpaid')} />
                    </TabsContent>
                    <TabsContent value="paid" className="mt-0">
                        <FineTable list={filterFines('paid')} />
                    </TabsContent>
                    <TabsContent value="waived" className="mt-0">
                        <FineTable list={filterFines('waived')} />
                    </TabsContent>
                    <TabsContent value="all" className="mt-0">
                        <FineTable list={filterFines()} />
                    </TabsContent>
                </Tabs>

                {fines.length > 0 && (
                    <div className="px-6 py-3 border-t">
                        <p className="text-xs text-muted-foreground">
                            <strong>{fines.length}</strong> total fine records
                        </p>
                    </div>
                )}
            </Card>

            {/* Waive Fine Sheet */}
            <Sheet open={waiveOpen} onOpenChange={setWaiveOpen}>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-blue-600" />
                            </div>
                            Waive Fine
                        </SheetTitle>
                        <SheetDescription>
                            Waive this fine with a mandatory reason note
                        </SheetDescription>
                    </SheetHeader>

                    {waiveError && (
                        <Alert variant="destructive" className="mb-5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{waiveError}</AlertDescription>
                        </Alert>
                    )}

                    {waivingFine && (
                        <div className="mb-6 bg-muted/40 rounded-lg border p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-11 bg-primary/10 rounded flex items-center justify-center">
                                    <BookOpen className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">{waivingFine.loan.book.title}</p>
                                    <p className="text-xs text-muted-foreground">Student: {waivingFine.student.name}</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Fine Amount</span>
                                <span className="font-bold text-red-600">₹{waivingFine.amount}</span>
                            </div>
                            <div className="text-sm">
                                <span className="text-muted-foreground">Reason: </span>
                                <span>{waivingFine.reason}</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleWaive} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">
                                Reason for Waiver <span className="text-destructive">*</span>
                            </Label>
                            <textarea
                                id="reason"
                                required
                                rows={4}
                                placeholder="Provide a clear reason for waiving this fine (e.g., medical emergency, system error, first-time offence)..."
                                value={waiveReason}
                                onChange={(e) => setWaiveReason(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                This reason will be recorded and visible to the student.
                                Minimum 5 characters required.
                            </p>
                        </div>

                        <Separator />

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setWaiveOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                disabled={waiveLoading || waiveReason.trim().length < 5}
                            >
                                {waiveLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Waiving...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        Waive Fine
                                    </span>
                                )}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}