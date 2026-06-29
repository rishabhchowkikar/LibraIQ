'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    BarChart3, Users, BookOpen, FileText, Clock,
    IndianRupee, AlertCircle, TrendingUp, BookMarked,
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer,
} from 'recharts';

interface Overview {
    totlaStudents?: number;
    totalStudents?: number;
    totalBooks: number;
    totalLoans: number;
    activeLoans: number;
    overdueLoans: number;
    totalFines: number;
    unpaidFines: number;
    totalRevenue: number;
    avgScore?: number;
    mostBorrowedBook: { title: string; author: string } | null;
    mostActiveStudent: { name: string; email: string } | null;
    onTimePercent: number;
    pendingRequests: number;
}

interface LoanTrendPoint { label: string; total: number; returned: number; overdue: number; lost: number }
interface RevenueTrendPoint { label: string; online: number; cash: number; link: number; total: number }
interface TopBook { title: string; author: string; genre: string; loanCount: number }
interface TierPoint { tier: string; count: number }
interface ScorePoint { range: string; count: number }
interface FineTrendPoint { label: string; paid: number; waived: number; outstanding: number }

const TIER_COLORS: Record<string, string> = {
    BRONZE: '#ea580c',
    SILVER: '#64748b',
    GOLD: '#ca8a04',
    PLATINUM: '#7c3aed',
};

const SCORE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#a855f7'];

const GENRE_COLORS: Record<string, string> = {
    Fiction: '#a855f7',
    'Self-Help': '#3b82f6',
    History: '#d97706',
    Technology: '#22c55e',
    Psychology: '#f43f5e',
};
const DEFAULT_GENRE_COLOR = '#64748b';

function ChartSkeleton({ height = 300 }: { height?: number }) {
    return <div className={`bg-muted rounded-lg animate-pulse`} style={{ height }} />;
}

function EmptyChart({ height = 300, label = 'No data available' }: { height?: number; label?: string }) {
    return (
        <div
            className="flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-lg"
            style={{ height }}
        >
            {label}
        </div>
    );
}

export default function AdminAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [loansTrend, setLoansTrend] = useState<LoanTrendPoint[]>([]);
    const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
    const [topBooks, setTopBooks] = useState<TopBook[]>([]);
    const [tierDist, setTierDist] = useState<TierPoint[]>([]);
    const [scoreDist, setScoreDist] = useState<ScorePoint[]>([]);
    const [fineTrend, setFineTrend] = useState<FineTrendPoint[]>([]);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [ov, lt, rt, tb, td, sd, ft] = await Promise.all([
                api.get('/analytics/overview'),
                api.get('/analytics/loans-trend'),
                api.get('/analytics/revenue-trend'),
                api.get('/analytics/top-books'),
                api.get('/analytics/tier-distribution'),
                api.get('/analytics/score-distribution'),
                api.get('/analytics/fine-trend'),
            ]);
            if (ov.data.success) setOverview(ov.data);
            if (lt.data.success) setLoansTrend(lt.data.data || []);
            if (rt.data.success) setRevenueTrend(rt.data.data || []);
            if (tb.data.success) setTopBooks(tb.data.data || []);
            if (td.data.success) setTierDist(td.data.data || []);
            if (sd.data.success) setScoreDist(sd.data.data || []);
            if (ft.data.success) setFineTrend(ft.data.data || []);
        } catch {
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const statCards = overview ? [
        { label: 'Total Students', value: overview.totlaStudents ?? overview.totalStudents ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Books', value: overview.totalBooks, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Total Loans', value: overview.totalLoans, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Active Loans', value: overview.activeLoans, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Total Revenue', value: `₹${overview.totalRevenue}`, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Unpaid Fines', value: `₹${overview.unpaidFines}`, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Avg Reader Score', value: overview.avgScore ?? '—', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Pending Requests', value: overview.pendingRequests, icon: BookMarked, color: 'text-orange-600', bg: 'bg-orange-50' },
    ] : [];

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Library insights and performance metrics</p>
                </div>
            </div>

            {/* Overview stat cards */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="shadow-sm">
                            <CardContent className="p-5 space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-7 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((s) => (
                        <Card key={s.label} className="shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                                        <p className="text-2xl font-bold truncate">{s.value}</p>
                                    </div>
                                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                                        <s.icon className={`w-5 h-5 ${s.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Loans + Revenue side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Loan Activity — Last 6 Months</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <ChartSkeleton /> : loansTrend.length === 0 ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={loansTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2} />
                                    <Line type="monotone" dataKey="returned" name="Returned" stroke="#16a34a" strokeWidth={2} />
                                    <Line type="monotone" dataKey="overdue" name="Overdue" stroke="#dc2626" strokeWidth={2} />
                                    <Line type="monotone" dataKey="lost" name="Lost" stroke="#6b7280" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Revenue Collection — Last 6 Months</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <ChartSkeleton /> : revenueTrend.length === 0 ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={revenueTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(value: any) => [`₹${value}`, '']} />
                                    <Legend />
                                    <Bar dataKey="online" name="Online" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cash" name="Cash" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="link" name="Link" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Books */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Top 10 Most Borrowed Books</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <ChartSkeleton height={350} /> : topBooks.length === 0 ? <EmptyChart height={350} /> : (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart
                                data={topBooks.map(b => ({
                                    ...b,
                                    shortTitle: b.title.length > 20 ? `${b.title.slice(0, 20)}…` : b.title,
                                }))}
                                layout="vertical"
                                margin={{ left: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                                <YAxis dataKey="shortTitle" type="category" width={150} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: any) => [value, 'Loans']}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.title || ''}
                                />
                                <Bar dataKey="loanCount" name="Loans" radius={[0, 4, 4, 0]}>
                                    {topBooks.map((b, i) => (
                                        <Cell key={i} fill={GENRE_COLORS[b.genre] || DEFAULT_GENRE_COLOR} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Tier + Score distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Student Tier Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <ChartSkeleton /> : tierDist.every(t => t.count === 0) ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={tierDist}
                                        dataKey="count"
                                        nameKey="tier"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={(props: any) => `${props.tier}: ${props.count}`}
                                    >
                                        {tierDist.map((t, i) => (
                                            <Cell key={i} fill={TIER_COLORS[t.tier] || DEFAULT_GENRE_COLOR} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Reader Score Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <ChartSkeleton /> : scoreDist.every(s => s.count === 0) ? <EmptyChart /> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={scoreDist}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                                        {scoreDist.map((_, i) => (
                                            <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Fine trends */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Fine Trends — Last 6 Months</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <ChartSkeleton /> : fineTrend.length === 0 ? <EmptyChart /> : (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={fineTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: any) => [`₹${value}`, '']} />
                                <Legend />
                                <Area type="monotone" dataKey="paid" name="Paid" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
                                <Area type="monotone" dataKey="waived" name="Waived" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                                <Area type="monotone" dataKey="outstanding" name="Outstanding" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
