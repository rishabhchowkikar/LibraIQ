'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, CheckCircle2, XCircle, RotateCcw, Clock, IndianRupee } from 'lucide-react';

interface Payment {
    id: string;
    receipt: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
    fineIds: string[];
}

const statusConfig: Record<string, { label: string; icon: any; cls: string; amtCls: string }> = {
    SUCCESS: { label: 'Paid', icon: CheckCircle2, cls: 'bg-green-100 text-green-700 border-green-200', amtCls: 'text-green-600' },
    FAILED: { label: 'Failed', icon: XCircle, cls: 'bg-red-100 text-red-700 border-red-200', amtCls: 'text-muted-foreground line-through' },
    REFUNDED: { label: 'Refunded', icon: RotateCcw, cls: 'bg-blue-100 text-blue-700 border-blue-200', amtCls: 'text-blue-600' },
    PENDING: { label: 'Pending', icon: Clock, cls: 'bg-amber-100 text-amber-700 border-amber-200', amtCls: 'text-amber-600' },
    CREATED: { label: 'Initiated', icon: Clock, cls: 'bg-gray-100 text-gray-700 border-gray-200', amtCls: 'text-muted-foreground' },
};

const methodLabel: Record<string, string> = { ONLINE: 'Online', CASH: 'Cash', LINK: 'UPI Link' };

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-56" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[0, 1].map(i => <Card key={i}><CardContent className="pt-5 pb-4"><Skeleton className="h-3 w-24 mb-2" /><Skeleton className="h-8 w-20" /></CardContent></Card>)}
            </div>
            <Card><CardContent className="pt-4 space-y-2">
                {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div>
                        <div className="flex items-center gap-3"><Skeleton className="h-5 w-14" /><Skeleton className="h-6 w-16 rounded-full" /></div>
                    </div>
                ))}
            </CardContent></Card>
        </div>
    );
}

export default function PaymentHistoryPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [totalPaid, setTotalPaid] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/payments/my-history')
            .then(({ data }) => {
                if (data.success) { setPayments(data.payments); setTotalPaid(data.totalPaid); }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <PageSkeleton />;

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <CreditCard className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
                    <p className="text-sm text-muted-foreground">All your fine payment transactions</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-sm"><CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Paid</p>
                    <p className="text-3xl font-bold mt-1 text-green-600">₹{totalPaid}</p>
                    <p className="text-xs text-muted-foreground mt-1">{payments.filter(p => p.status === 'SUCCESS').length} transactions</p>
                </CardContent></Card>
                <Card className="shadow-sm"><CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Records</p>
                    <p className="text-3xl font-bold mt-1">{payments.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">All time</p>
                </CardContent></Card>
            </div>

            <Card className="shadow-sm">
                {payments.length === 0 ? (
                    <CardContent className="py-16 text-center">
                        <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-muted-foreground">No payment records yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Your transactions will appear here</p>
                    </CardContent>
                ) : (
                    <div className="divide-y">
                        {payments.map(payment => {
                            const cfg = statusConfig[payment.status] || statusConfig.CREATED;
                            const Icon = cfg.icon;
                            return (
                                <div key={payment.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${payment.status === 'SUCCESS' ? 'bg-green-100' : 'bg-muted'}`}>
                                            <Icon className={`w-4 h-4 ${payment.status === 'SUCCESS' ? 'text-green-600' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm">{payment.receipt}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                                <span>{methodLabel[payment.method] || payment.method}</span>
                                                <span>·</span>
                                                <span>{payment.fineIds.length} fine{payment.fineIds.length !== 1 ? 's' : ''}</span>
                                                <span>·</span>
                                                <span>{new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className={`font-bold flex items-center gap-0.5 ${cfg.amtCls}`}>
                                            <IndianRupee className="w-3.5 h-3.5" />{payment.amount}
                                        </span>
                                        <Badge className={`gap-1 text-xs ${cfg.cls}`}>
                                            <Icon className="w-3 h-3" />{cfg.label}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}