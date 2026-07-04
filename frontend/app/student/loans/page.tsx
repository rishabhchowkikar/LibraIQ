'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Loan } from '@/lib/type';
import {
    BookOpen,
    Calendar,
    Clock,
    Search,
    CheckCircle2,
    XCircle,
    AlertCircle,
} from 'lucide-react';
import { StudentLoansSkeleton } from '@/components/shared/DashboardSkeleton';

type FilterType = 'ALL' | 'ACTIVE' | 'RETURNED' | 'OVERDUE';

export default function StudentLoansPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

    useEffect(() => {
        fetchLoans();
    }, []);

    const fetchLoans = async () => {
        try {
            const { data } = await api.get('/loans/my-loans');
            if (data.success) {
                setLoans(data.loans);
            }
        } catch {
            toast.error('Failed to load your loans');
        } finally {
            setLoading(false);
        }
    };

    const filteredLoans = loans.filter((loan) => {
        const matchesSearch =
            loan.book?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loan.book?.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'ALL' || loan.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const counts = {
        all: loans.length,
        active: loans.filter(l => l.status === 'ACTIVE').length,
        returned: loans.filter(l => l.status === 'RETURNED').length,
        overdue: loans.filter(l => l.status === 'OVERDUE').length,
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
            ACTIVE: { bg: 'bg-primary/10 text-primary', text: 'text-primary', icon: Clock, label: 'Active' },
            RETURNED: { bg: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2, label: 'Returned' },
            OVERDUE: { bg: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400', text: 'text-red-700 dark:text-red-400', icon: AlertCircle, label: 'Overdue' },
            LOST: { bg: 'bg-muted text-foreground', text: 'text-foreground', icon: XCircle, label: 'Lost' },
        };
        return configs[status] || configs.ACTIVE;
    };

    const filters: { key: FilterType; label: string; count: number }[] = [
        { key: 'ALL', label: 'All Loans', count: counts.all },
        { key: 'ACTIVE', label: 'Active', count: counts.active },
        { key: 'RETURNED', label: 'Returned', count: counts.returned },
        { key: 'OVERDUE', label: 'Overdue', count: counts.overdue },
    ];

    if (loading) return <StudentLoansSkeleton />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">My Loans</h1>
                        <p className="text-muted-foreground">Your complete borrowing history</p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setActiveFilter(filter.key)}
                            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeFilter === filter.key
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                        >
                            {filter.label}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeFilter === filter.key ? 'bg-primary-foreground/20' : 'bg-border'}`}>
                                {filter.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by book title or author..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition outline-none"
                    />
                </div>
            </div>

            {/* Loans List */}
            <div className="space-y-4">
                {filteredLoans.length === 0 ? (
                    <div className="bg-card rounded-lg border border-border p-12 text-center">
                        <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-foreground font-medium mb-1">No loans found</p>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? 'Try a different search term' : "You haven't borrowed any books yet"}
                        </p>
                    </div>
                ) : (
                    filteredLoans.map((loan) => {
                        const statusConfig = getStatusConfig(loan.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <div
                                key={loan.id}
                                className="bg-card rounded-lg border border-border p-6 hover:bg-muted/20 transition-colors"
                            >
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-16 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                                                <BookOpen className="w-6 h-6 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-foreground mb-1 truncate">
                                                    {loan.book?.title}
                                                </h3>
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    by {loan.book?.author}
                                                </p>

                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>Issued: {new Date(loan.issuedAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-4 h-4" />
                                                        <span>Due: {new Date(loan.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    {loan.returnedAt && (
                                                        <div className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                            <span>Returned: {new Date(loan.returnedAt).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {loan.fines && loan.fines.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-border">
                                                        {loan.fines.map((fine) => (
                                                            <div key={fine.id} className="flex items-center gap-2 text-sm">
                                                                {fine.paidAt ? (
                                                                    <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                        Fine paid: ₹{fine.amount}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-destructive font-medium flex items-center gap-1">
                                                                        <AlertCircle className="w-4 h-4" />
                                                                        Outstanding fine: ₹{fine.amount}
                                                                    </span>
                                                                )}
                                                                {fine.reason && (
                                                                    <span className="text-muted-foreground">({fine.reason})</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-3 py-1.5 rounded-md font-semibold text-sm flex items-center gap-1.5 ${statusConfig.bg}`}>
                                            <StatusIcon className="w-4 h-4" />
                                            {statusConfig.label}
                                        </span>
                                        {loan.extendedCount > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                Extended {loan.extendedCount}x
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {filteredLoans.length > 0 && (
                <div className="mt-6 bg-accent border border-accent rounded-lg p-4">
                    <p className="text-sm text-accent-foreground">
                        Showing <strong>{filteredLoans.length}</strong> of <strong>{loans.length}</strong> total loans
                    </p>
                </div>
            )}
        </div>
    );
}
