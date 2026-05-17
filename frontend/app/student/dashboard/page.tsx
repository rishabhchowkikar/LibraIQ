'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Loan } from '@/lib/type';
import { BookOpen, Calendar, Clock, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { StudentDashboardSkeleton } from '@/components/shared/DashboardSkeleton';

export default function StudentDashboard() {
    const { user } = useAuthStore();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);

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
            toast.error('Failed to load your dashboard');
        } finally {
            setLoading(false);
        }
    };

    const activeLoans = loans.filter((loan) => loan.status === 'ACTIVE');
    const returnedLoans = loans.filter((loan) => loan.status === 'RETURNED');
    const overdueLoans = loans.filter((loan) => loan.status === 'OVERDUE');
    const onTimeRate = returnedLoans.length > 0
        ? Math.round((returnedLoans.length / (returnedLoans.length + overdueLoans.length)) * 100)
        : 100;

    const getDaysUntilDue = (dueDate: string) => {
        const due = new Date(dueDate);
        const today = new Date();
        return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getStatusBadge = (loan: Loan) => {
        if (loan.status === 'OVERDUE') {
            return { color: 'border-red-200 bg-red-50', text: 'text-red-700', badge: 'bg-red-600 text-white' };
        }
        const daysLeft = getDaysUntilDue(loan.dueDate);
        if (daysLeft <= 3) {
            return { color: 'border-orange-200 bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-600 text-white' };
        }
        if (daysLeft <= 7) {
            return { color: 'border-yellow-200 bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-600 text-white' };
        }
        return { color: 'border-green-200 bg-green-50', text: 'text-green-700', badge: 'bg-green-600 text-white' };
    };

    if (loading) return <StudentDashboardSkeleton />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Welcome back, {user?.name?.split(' ')[0]}
                        </h1>
                        <p className="text-gray-600">Here's your reading journey at a glance</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-600">Active Loans</p>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{activeLoans.length}</p>
                    <p className="text-xs text-gray-500">Currently borrowed</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-600">Total Borrowed</p>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{loans.length}</p>
                    <p className="text-xs text-gray-500">All-time count</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-600">On-Time Rate</p>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{onTimeRate}%</p>
                    <p className="text-xs text-gray-500">Timely returns</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-600">Overdue</p>
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{overdueLoans.length}</p>
                    <p className="text-xs text-gray-500">Past due date</p>
                </div>
            </div>

            {/* Active Loans */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <BookOpen className="w-5 h-5 text-gray-700" />
                    <h2 className="text-xl font-bold text-gray-900">Active Loans</h2>
                </div>

                {activeLoans.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium mb-1">No active loans</p>
                        <p className="text-sm text-gray-500">Visit the library to borrow your first book!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeLoans.map((loan) => {
                            const daysLeft = getDaysUntilDue(loan.dueDate);
                            const status = getStatusBadge(loan);

                            return (
                                <div
                                    key={loan.id}
                                    className={`border-2 rounded-xl p-5 ${status.color} hover:shadow-md transition-shadow`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">
                                                {loan.book?.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-4">
                                                by {loan.book?.author}
                                            </p>

                                            <div className="flex flex-wrap gap-4 text-sm">
                                                <div className={`flex items-center gap-2 ${status.text}`}>
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="font-medium">
                                                        Due: {new Date(loan.dueDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className={`flex items-center gap-2 ${status.text}`}>
                                                    <Clock className="w-4 h-4" />
                                                    <span className="font-medium">
                                                        {loan.status === 'OVERDUE'
                                                            ? `${Math.abs(daysLeft)} days overdue`
                                                            : daysLeft === 0
                                                                ? 'Due today!'
                                                                : `${daysLeft} days left`}
                                                    </span>
                                                </div>
                                            </div>

                                            {loan.fines && loan.fines.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-current/20">
                                                    <p className="text-sm font-bold text-red-700">
                                                        Fine: ₹{loan.fines.reduce((sum, fine) => sum + fine.amount, 0)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap ${status.badge}`}>
                                            {loan.status === 'OVERDUE' ? 'Overdue' : daysLeft === 0 ? 'Due Today' : 'Active'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
