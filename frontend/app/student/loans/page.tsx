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
            ACTIVE: { bg: 'bg-blue-100 text-blue-800', text: 'text-blue-700', icon: Clock, label: 'Active' },
            RETURNED: { bg: 'bg-green-100 text-green-800', text: 'text-green-700', icon: CheckCircle2, label: 'Returned' },
            OVERDUE: { bg: 'bg-red-100 text-red-800', text: 'text-red-700', icon: AlertCircle, label: 'Overdue' },
            LOST: { bg: 'bg-gray-100 text-gray-800', text: 'text-gray-700', icon: XCircle, label: 'Lost' },
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
                    <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Loans</h1>
                        <p className="text-gray-600">Your complete borrowing history</p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setActiveFilter(filter.key)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeFilter === filter.key
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {filter.label}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeFilter === filter.key ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                {filter.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by book title or author..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                </div>
            </div>

            {/* Loans List */}
            <div className="space-y-4">
                {filteredLoans.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium mb-1">No loans found</p>
                        <p className="text-sm text-gray-500">
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
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-16 bg-linear-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center shrink-0">
                                                <BookOpen className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                                                    {loan.book?.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 mb-3">
                                                    by {loan.book?.author}
                                                </p>

                                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        {loan.fines.map((fine) => (
                                                            <div key={fine.id} className="flex items-center gap-2 text-sm">
                                                                {fine.paidAt ? (
                                                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                        Fine paid: ₹{fine.amount}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-red-600 font-medium flex items-center gap-1">
                                                                        <AlertCircle className="w-4 h-4" />
                                                                        Outstanding fine: ₹{fine.amount}
                                                                    </span>
                                                                )}
                                                                {fine.reason && (
                                                                    <span className="text-gray-500">({fine.reason})</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-1.5 ${statusConfig.bg}`}>
                                            <StatusIcon className="w-4 h-4" />
                                            {statusConfig.label}
                                        </span>
                                        {loan.extendedCount > 0 && (
                                            <span className="text-xs text-gray-500">
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
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800">
                        Showing <strong>{filteredLoans.length}</strong> of <strong>{loans.length}</strong> total loans
                    </p>
                </div>
            )}
        </div>
    );
}
