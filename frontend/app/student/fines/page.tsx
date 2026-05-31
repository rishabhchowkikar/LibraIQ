'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    Receipt, AlertCircle, CheckCircle2, BookOpen,
    Calendar, IndianRupee, ShieldCheck, CreditCard,
} from 'lucide-react';

interface Fine {
    id: string;
    amount: number;
    reason: string;
    paidAt: string | null;
    waivedBy: string | null;
    createdAt: string;
    loan: { book: { title: string; author: string }; dueDate: string };
}

interface Summary { unpaidCount: number; totalOutstanding: number; }

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(i => <Card key={i}><CardContent className="pt-5 pb-4"><Skeleton className="h-3 w-24 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>)}
            </div>
        </div>
    );
}

export default function StudentFinesPage() {
    const { user } = useAuthStore();
    const [fines, setFines] = useState<Fine[]>([]);
    const [summary, setSummary] = useState<Summary>({ unpaidCount: 0, totalOutstanding: 0 });
    const [loading, setLoading] = useState(true);
    const [payingIds, setPayingIds] = useState<string[]>([]);

    useEffect(() => { fetchFines(); }, []);

    const fetchFines = async () => {
        try {
            const { data } = await api.get('/fines/my-fines');
            if (data.success) { setFines(data.fines); setSummary(data.summary); }
        } catch { toast.error('Failed to load fines'); }
        finally { setLoading(false); }
    };

    const unpaidFines = fines.filter(f => !f.paidAt && !f.waivedBy);
    const paidFines = fines.filter(f => f.paidAt);
    const waivedFines = fines.filter(f => f.waivedBy);

    const handlePayOnline = async (fineIds: string[]) => {
        const amount = fineIds.reduce((sum, id) => {
            const fine = fines.find(f => f.id === id);
            return sum + (fine?.amount || 0);
        }, 0);

        setPayingIds(fineIds);
        try {
            const { data } = await api.post('/payments/create-order', { fineIds });
            if (!data.success) { toast.error(data.error); setPayingIds([]); return; }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: data.amount * 100,
                currency: 'INR',
                name: 'LibraIQ',
                description: `Fine Payment — ₹${data.amount}`,
                order_id: data.orderId,
                prefill: { name: user?.name, email: user?.email },
                theme: { color: '#2563eb' },
                handler: async (response: any) => {
                    try {
                        const { data: vd } = await api.post('/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        if (vd.success) {
                            toast.success(vd.message || '✅ Payment successful!');
                            await fetchFines();
                        }
                    } catch { toast.error('Verification failed. Contact support.'); }
                    finally { setPayingIds([]); }
                },
                modal: {
                    ondismiss: async () => {
                        await api.post('/payments/mark-failed', { orderId: data.orderId, reason: 'User closed payment window' }).catch(() => { });
                        setPayingIds([]);
                    },
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', async (resp: any) => {
                await api.post('/payments/mark-failed', { orderId: data.orderId, reason: resp.error.description }).catch(() => { });
                toast.error(`Payment failed: ${resp.error.description}`);
                setPayingIds([]);
            });
            rzp.open();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to initiate payment');
            setPayingIds([]);
        }
    };

    const EmptyState = ({ message }: { message: string }) => (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">{message}</p>
        </div>
    );

    const FineCard = ({ fine }: { fine: Fine }) => {
        const isUnpaid = !fine.paidAt && !fine.waivedBy;
        const isPaying = payingIds.includes(fine.id);
        const anyPaying = payingIds.length > 0;
        const waiveNote = fine.reason?.includes('| Waived:') ? fine.reason.split('| Waived:')[1].trim() : null;

        const status = fine.paidAt
            ? { label: 'Paid', icon: CheckCircle2, cls: 'bg-green-100 text-green-700 border-green-200' }
            : fine.waivedBy
                ? { label: 'Waived', icon: ShieldCheck, cls: 'bg-blue-100 text-blue-700 border-blue-200' }
                : { label: 'Unpaid', icon: AlertCircle, cls: 'bg-red-100 text-red-700 border-red-200' };
        const SI = status.icon;

        return (
            <div className={`border rounded-xl p-4 transition-colors ${isUnpaid ? 'border-red-200 bg-red-50/30' : 'border-border bg-background'}`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${isUnpaid ? 'bg-red-100' : 'bg-muted'}`}>
                            <BookOpen className={`w-5 h-5 ${isUnpaid ? 'text-red-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{fine.loan.book.title}</p>
                            <p className="text-sm text-muted-foreground">{fine.loan.book.author}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Due: {new Date(fine.loan.dueDate).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Receipt className="w-3 h-3" />
                                    {fine.reason?.split('| Waived:')[0].trim()}
                                </span>
                            </div>
                            {waiveNote && <p className="text-xs text-blue-600 mt-1.5 italic">Waiver: "{waiveNote}"</p>}
                            {fine.paidAt && <p className="text-xs text-green-600 mt-1.5">Paid on {new Date(fine.paidAt).toLocaleDateString()}</p>}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className='flex items-center justify-between gap-2.5'>
                            <div className="flex items-center gap-0.5">
                                <IndianRupee className={`w-4 h-4 ${isUnpaid ? 'text-red-600' : 'text-muted-foreground'}`} />
                                <span className={`text-xl font-bold ${isUnpaid ? 'text-red-600' : 'text-foreground'}`}>{fine.amount}</span>
                            </div>
                            <Badge className={`gap-1 text-xs ${status.cls}`}>
                                <SI className="w-3 h-3" />{status.label}
                            </Badge>
                        </div>
                        {isUnpaid && (
                            <Button
                                size="sm"
                                onClick={() => handlePayOnline([fine.id])}
                                disabled={anyPaying}
                                className="!bg-purple-900 cursor-pointer  gap-1 h-7 text-xs mt-1"
                            >
                                {isPaying ? (
                                    <span className="flex items-center gap-1">
                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        <IndianRupee className="w-3 h-3" />Pay ₹{fine.amount}
                                    </span>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <PageSkeleton />;

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <Receipt className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Fines</h1>
                    <p className="text-sm text-muted-foreground">View and pay your library fines online</p>
                </div>
            </div>

            {/* Alert + Pay All */}
            {summary.unpaidCount > 0 && (
                <div className="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-800">Account Restricted</p>
                            <p className="text-sm text-red-700 mt-0.5">
                                <strong>{summary.unpaidCount} unpaid fine{summary.unpaidCount > 1 ? 's' : ''}</strong> totalling ₹{summary.totalOutstanding}. New loans blocked.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => handlePayOnline(unpaidFines.map(f => f.id))}
                        disabled={payingIds.length > 0}
                        className="!bg-purple-900 cursor-pointer gap-2 shrink-0"
                    >
                        {payingIds.length === unpaidFines.length && unpaidFines.length > 1 ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Pay All ₹{summary.totalOutstanding}
                            </span>
                        )}
                    </Button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Outstanding', value: `₹${summary.totalOutstanding}`, color: 'text-red-600', sub: `${summary.unpaidCount} unpaid` },
                    { label: 'Paid', value: `₹${paidFines.reduce((s, f) => s + f.amount, 0)}`, color: 'text-green-600', sub: `${paidFines.length} cleared` },
                    { label: 'Waived', value: `₹${waivedFines.reduce((s, f) => s + f.amount, 0)}`, color: 'text-blue-600', sub: `${waivedFines.length} waived` },
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

            {/* Tabs */}
            <Card className="shadow-sm">
                <Tabs defaultValue="unpaid">
                    <CardHeader className="pb-0">
                        <TabsList>
                            <TabsTrigger value="unpaid" className="gap-1.5 text-xs">
                                Unpaid
                                {unpaidFines.length > 0 && <Badge className="text-xs px-1.5 bg-red-100 text-red-700 border-0">{unpaidFines.length}</Badge>}
                            </TabsTrigger>
                            <TabsTrigger value="paid" className="text-xs">
                                Paid <Badge variant="secondary" className="text-xs px-1.5 ml-1">{paidFines.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="waived" className="text-xs">
                                Waived <Badge variant="secondary" className="text-xs px-1.5 ml-1">{waivedFines.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="all" className="text-xs">
                                All <Badge variant="secondary" className="text-xs px-1.5 ml-1">{fines.length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <Separator className="mt-4" />
                    <CardContent className="pt-4">
                        <TabsContent value="unpaid" className="mt-0 space-y-3">
                            {unpaidFines.length === 0 ? <EmptyState message="No unpaid fines — great job! 🎉" /> : unpaidFines.map(f => <FineCard key={f.id} fine={f} />)}
                        </TabsContent>
                        <TabsContent value="paid" className="mt-0 space-y-3">
                            {paidFines.length === 0 ? <EmptyState message="No paid fines yet" /> : paidFines.map(f => <FineCard key={f.id} fine={f} />)}
                        </TabsContent>
                        <TabsContent value="waived" className="mt-0 space-y-3">
                            {waivedFines.length === 0 ? <EmptyState message="No waived fines" /> : waivedFines.map(f => <FineCard key={f.id} fine={f} />)}
                        </TabsContent>
                        <TabsContent value="all" className="mt-0 space-y-3">
                            {fines.length === 0 ? <EmptyState message="No fines on record" /> : fines.map(f => <FineCard key={f.id} fine={f} />)}
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}