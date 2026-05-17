'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Loan, Book } from '@/lib/type';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Clock, AlertCircle, TrendingUp, LayoutDashboard, CheckCircle2 } from 'lucide-react';
import { AdminDashboardSkeleton } from '@/components/shared/DashboardSkeleton';

export default function AdminDashboard() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [l, b] = await Promise.all([api.get('/loans'), api.get('/books')]);
            if (l.data.success) setLoans(l.data.loans);
            if (b.data.success) setBooks(b.data.books);
        } catch {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const activeLoans = loans.filter(l => l.status === 'ACTIVE');
    const overdueLoans = loans.filter(l => l.status === 'OVERDUE');
    const recentLoans = [...loans]
        .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
        .slice(0, 8);

    const stats = [
        { title: 'Total Books', value: books.length, sub: `${books.reduce((s, b) => s + b.totalCopies, 0)} total copies`, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
        { title: 'Active Loans', value: activeLoans.length, sub: `${books.reduce((s, b) => s + b.availableCopies, 0)} books available`, icon: Clock, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
        { title: 'Overdue', value: overdueLoans.length, sub: 'Require attention', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
        { title: 'Total Loans', value: loans.length, sub: 'All time', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
    ];

    const getStatusBadge = (status: string) => {
        if (status === 'ACTIVE') return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Active</Badge>;
        if (status === 'RETURNED') return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Returned</Badge>;
        if (status === 'OVERDUE') return <Badge variant="destructive">Overdue</Badge>;
        return <Badge variant="secondary">{status}</Badge>;
    };

    if (loading) return <AdminDashboardSkeleton />;

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Library overview and recent activity</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <Card key={s.title} className="border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">{s.title}</p>
                                    <p className="text-3xl font-bold">{s.value}</p>
                                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                                </div>
                                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                                    <s.icon className={`w-5 h-5 ${s.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Loans */}
            <Card className="shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">Recent Loans</CardTitle>
                            <CardDescription>Latest borrowing activity</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-normal">
                            {loans.length} total
                        </Badge>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="p-0">
                    {recentLoans.length === 0 ? (
                        <div className="text-center py-12">
                            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No loans recorded yet</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {recentLoans.map((loan) => (
                                <div key={loan.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-9 h-11 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{loan.book?.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{loan.student?.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <p className="text-xs text-muted-foreground hidden sm:block">
                                            {new Date(loan.issuedAt).toLocaleDateString()}
                                        </p>
                                        {getStatusBadge(loan.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
