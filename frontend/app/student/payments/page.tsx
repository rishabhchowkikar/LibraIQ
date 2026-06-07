'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from '@/components/ui/table';
import {
    CreditCard, CheckCircle2, XCircle, RotateCcw,
    Clock, Wallet, TrendingUp, AlertCircle, Receipt,
} from 'lucide-react';

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

const statusConfig = {
    SUCCESS: { label: 'Paid', icon: CheckCircle2, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', amt: 'text-emerald-600', dot: 'bg-emerald-500', accent: '#10b981', iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600' },
    FAILED: { label: 'Failed', icon: XCircle, badge: 'bg-red-50 text-red-600 border-red-200', amt: 'text-muted-foreground line-through', dot: 'bg-red-500', accent: '#ef4444', iconBg: 'bg-red-50', iconFg: 'text-red-500' },
    REFUNDED: { label: 'Refunded', icon: RotateCcw, badge: 'bg-sky-50 text-sky-700 border-sky-200', amt: 'text-sky-600', dot: 'bg-sky-500', accent: '#0ea5e9', iconBg: 'bg-sky-50', iconFg: 'text-sky-500' },
    PENDING: { label: 'Pending', icon: Clock, badge: 'bg-amber-50 text-amber-700 border-amber-200', amt: 'text-amber-600', dot: 'bg-amber-500', accent: '#f59e0b', iconBg: 'bg-amber-50', iconFg: 'text-amber-500' },
    CREATED: { label: 'Initiated', icon: Clock, badge: 'bg-zinc-100 text-zinc-600 border-zinc-200', amt: 'text-muted-foreground', dot: 'bg-zinc-400', accent: '#d1d5db', iconBg: 'bg-muted', iconFg: 'text-muted-foreground' },
} as const;

type StatusKey = keyof typeof statusConfig;

const methodLabel: Record<string, string> = { ONLINE: 'Online', CASH: 'Cash', LINK: 'UPI Link' };
const methodIcon: Record<string, string> = { ONLINE: '💳', CASH: '💵', LINK: '🔗' };

const TABS = ['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'] as const;
type TabKey = typeof TABS[number];
const TAB_LABELS: Record<TabKey, string> = {
    ALL: 'All', SUCCESS: 'Paid', PENDING: 'Pending', FAILED: 'Failed', REFUNDED: 'Refunded',
};

/* ── Stat card ───────────────────────────────────────────────────── */
type StatColor = 'emerald' | 'indigo' | 'amber' | 'zinc';

const statPalette: Record<StatColor, { from: string; text: string; sub: string; lbl: string; iconBg: string; iconFg: string }> = {
    emerald: { from: 'from-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-600/70', lbl: 'text-emerald-600', iconBg: 'bg-emerald-100', iconFg: 'text-emerald-600' },
    indigo: { from: 'from-indigo-50', text: 'text-indigo-700', sub: 'text-indigo-600/70', lbl: 'text-indigo-600', iconBg: 'bg-indigo-100', iconFg: 'text-indigo-600' },
    amber: { from: 'from-amber-50', text: 'text-amber-700', sub: 'text-amber-600/70', lbl: 'text-amber-600', iconBg: 'bg-amber-100', iconFg: 'text-amber-600' },
    zinc: { from: 'from-zinc-50', text: 'text-foreground', sub: 'text-muted-foreground', lbl: 'text-muted-foreground', iconBg: 'bg-muted', iconFg: 'text-muted-foreground' },
};

function StatCard({ loading, color, icon: Icon, label, value, sub }: {
    loading: boolean; color: StatColor; icon: React.ElementType;
    label: string; value: string | number; sub: string;
}) {
    const c = statPalette[color];
    return (
        <div className={`rounded-2xl border bg-linear-to-br ${c.from} to-white p-5`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${c.lbl}`}>{label}</p>
                    {loading
                        ? <Skeleton className="h-8 w-24 mb-1" />
                        : <p className={`text-2xl font-extrabold leading-none ${c.text}`}>{value}</p>
                    }
                    <p className={`text-xs mt-1.5 ${c.sub}`}>{sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
                    <Icon className={`w-5 h-5 ${c.iconFg}`} />
                </div>
            </div>
        </div>
    );
}

/* ── Skeleton rows ───────────────────────────────────────────────── */
function SkeletonRows() {
    return (
        <div className="rounded-2xl border overflow-hidden bg-card">
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-0">
                    <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3.5 w-12" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
            ))}
        </div>
    );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function PaymentHistoryPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [totalPaid, setTotalPaid] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>('ALL');

    useEffect(() => {
        api.get('/payments/my-history')
            .then(({ data }) => {
                if (data.success) { setPayments(data.payments); setTotalPaid(data.totalPaid); }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const successCount = payments.filter(p => p.status === 'SUCCESS').length;
    const pendingCount = payments.filter(p => ['PENDING', 'CREATED'].includes(p.status)).length;
    const filtered = tab === 'ALL' ? payments : payments.filter(p => p.status === tab);
    const tabCount = (s: TabKey) => s === 'ALL' ? payments.length : payments.filter(p => p.status === s).length;
    const filteredTotal = filtered.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="space-y-6 p-6 pb-12">

            {/* Header */}
            <div>
                <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                        <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Payment History</h1>
                </div>
                <p className="text-sm text-muted-foreground ml-12">Track all your fine payment transactions</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard loading={loading} color="emerald" icon={Wallet}
                    label="Total Paid" value={`₹${totalPaid.toLocaleString('en-IN')}`} sub={`${successCount} successful`} />
                <StatCard loading={loading} color="indigo" icon={TrendingUp}
                    label="Total Records" value={payments.length} sub="All time" />
                <StatCard loading={loading} color={pendingCount > 0 ? 'amber' : 'zinc'} icon={AlertCircle}
                    label="Pending" value={pendingCount} sub="Awaiting payment" />
            </div>

            {/* Tabs + table */}
            <div className="space-y-4">

                {/* Tab row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-3 p-1 rounded-xl !bg-gray-500">
                        {TABS.map(s => {
                            const isActive = tab === s;
                            const cfg = statusConfig[s as StatusKey];
                            return (
                                <button
                                    key={s}
                                    onClick={() => setTab(s)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer p-3 ${isActive
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                                        }`}
                                >
                                    {cfg && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />}
                                    {TAB_LABELS[s]}
                                    {/* <span className={`text-[11px] font-bold rounded-md px-1.5 py-0.5 min-w-5 text-center ${isActive ? 'bg-muted text-foreground' : 'bg-muted/70 text-muted-foreground'
                                        }`}>{tabCount(s)}</span> */}
                                </button>
                            );
                        })}
                    </div>

                    {!loading && filteredTotal > 0 && (
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 shrink-0">
                            ₹{filteredTotal.toLocaleString('en-IN')}
                            <span className="text-xs font-normal text-emerald-600/60">paid</span>
                        </div>
                    )}
                </div>

                {/* Table area */}
                {loading ? <SkeletonRows /> : filtered.length === 0 ? (
                    <div className="flex p-4 flex-col items-center justify-center py-20 rounded-2xl border border-dashed bg-muted/20">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                            <Receipt className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="font-semibold text-muted-foreground">No transactions</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">Nothing to show for this filter</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border overflow-hidden bg-card shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow className="hover:bg-muted/40">
                                    <TableHead className="pl-6 pr-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Receipt</TableHead>
                                    <TableHead className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Date &amp; Time</TableHead>
                                    <TableHead className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Method</TableHead>
                                    <TableHead className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Fines</TableHead>
                                    <TableHead className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Amount</TableHead>
                                    <TableHead className="pl-4 pr-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {filtered.map(payment => {
                                    const cfg = statusConfig[payment.status as StatusKey] ?? statusConfig.CREATED;
                                    const Icon = cfg.icon;
                                    const date = new Date(payment.paidAt || payment.createdAt);
                                    return (
                                        <TableRow
                                            key={payment.id}
                                            style={{ borderLeft: `3px solid ${cfg.accent}` }}
                                            className="hover:bg-muted/30"
                                        >
                                            {/* Receipt */}
                                            <TableCell className="pl-5 pr-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                                                        <Icon className={`w-4 h-4 ${cfg.iconFg}`} />
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-foreground">{payment.receipt}</span>
                                                </div>
                                            </TableCell>

                                            {/* Date */}
                                            <TableCell className="px-4 py-4">
                                                <p className="text-sm font-medium text-foreground leading-tight">
                                                    {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </TableCell>

                                            {/* Method */}
                                            <TableCell className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <span>{methodIcon[payment.method] ?? '💳'}</span>
                                                    <span>{methodLabel[payment.method] ?? payment.method}</span>
                                                </div>
                                            </TableCell>

                                            {/* Fines */}
                                            <TableCell className="px-4 py-4 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                                                    {payment.fineIds.length}
                                                </span>
                                            </TableCell>

                                            {/* Amount */}
                                            <TableCell className="px-4 py-4 text-right">
                                                <span className={`text-sm font-bold ${cfg.amt}`}>
                                                    ₹{payment.amount.toLocaleString('en-IN')}
                                                </span>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="pl-4 pr-6 py-4 text-center">
                                                <Badge variant="outline" className={`gap-1.5 text-[11px] font-semibold px-2.5 py-1 ${cfg.badge}`}>
                                                    <Icon className="w-3 h-3" />
                                                    {cfg.label}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
