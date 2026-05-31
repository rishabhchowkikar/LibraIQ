'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CreditCard, Search, CheckCircle2, XCircle, RotateCcw, Clock, IndianRupee, TrendingUp } from 'lucide-react';

interface Payment {
    id: string;
    receipt: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
    fineIds: string[];
    student: { id: string; name: string; email: string };
}

const statusConfig: Record<string, { label: string; icon: any; cls: string }> = {
    SUCCESS: { label: 'Paid', icon: CheckCircle2, cls: 'bg-green-100 text-green-700 border-green-200' },
    FAILED: { label: 'Failed', icon: XCircle, cls: 'bg-red-100 text-red-700 border-red-200' },
    REFUNDED: { label: 'Refunded', icon: RotateCcw, cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    PENDING: { label: 'Pending', icon: Clock, cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    CREATED: { label: 'Initiated', icon: Clock, cls: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const methodLabel: Record<string, string> = { ONLINE: 'Online', CASH: 'Cash', LINK: 'UPI Link' };

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48" /></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[0, 1, 2, 3].map(i => <Card key={i}><CardContent className="pt-5 pb-4"><Skeleton className="h-3 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>)}
            </div>
        </div>
    );
}

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [totalCollected, setTotalCollected] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.get('/payments')
            .then(({ data }) => {
                if (data.success) { setPayments(data.payments); setTotalCollected(data.totalCollected); }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const filtered = payments.filter(p => {
        const q = search.toLowerCase();
        return (
            p.student?.name.toLowerCase().includes(q) ||
            p.student?.email.toLowerCase().includes(q) ||
            p.receipt.toLowerCase().includes(q)
        );
    });

    const successPayments = payments.filter(p => p.status === 'SUCCESS');
    const onlineCollected = successPayments.filter(p => p.method === 'ONLINE').reduce((s, p) => s + p.amount, 0);
    const cashCollected = successPayments.filter(p => p.method === 'CASH').reduce((s, p) => s + p.amount, 0);
    const linkCollected = successPayments.filter(p => p.method === 'LINK').reduce((s, p) => s + p.amount, 0);

    if (loading) return <PageSkeleton />;

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <CreditCard className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
                    <p className="text-sm text-muted-foreground">All fine payment transactions</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Collected', value: `₹${totalCollected}`, color: 'text-green-600', sub: `${successPayments.length} transactions` },
                    { label: 'Online', value: `₹${onlineCollected}`, color: 'text-blue-600', sub: 'Razorpay' },
                    { label: 'UPI Links', value: `₹${linkCollected}`, color: 'text-purple-600', sub: 'Payment links' },
                    { label: 'Cash', value: `₹${cashCollected}`, color: 'text-amber-600', sub: 'At counter' },
                ].map(s => (
                    <Card key={s.label} className="shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by student or receipt..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>

                <Separator />

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                            <CreditCard className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-muted-foreground">No payment records found</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Receipt</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Fines</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(payment => {
                                const cfg = statusConfig[payment.status] || statusConfig.CREATED;
                                const Icon = cfg.icon;
                                return (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            <span className="font-mono text-xs text-muted-foreground">{payment.receipt}</span>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-sm">{payment.student?.name}</p>
                                            <p className="text-xs text-muted-foreground">{payment.student?.email}</p>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{methodLabel[payment.method] || payment.method}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-xs">
                                                {payment.fineIds.length} fine{payment.fineIds.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={`font-bold flex items-center justify-end gap-0.5 ${payment.status === 'SUCCESS' ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                <IndianRupee className="w-3.5 h-3.5" />{payment.amount}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`gap-1 text-xs ${cfg.cls}`}>
                                                <Icon className="w-3 h-3" />{cfg.label}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}

                {payments.length > 0 && (
                    <div className="px-6 py-3 border-t">
                        <p className="text-xs text-muted-foreground">
                            <strong>{payments.length}</strong> total transactions
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
}