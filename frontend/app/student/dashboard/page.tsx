'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Loan } from '@/lib/type';
import { BookOpen, Calendar, Clock, AlertCircle, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { StudentDashboardSkeleton } from '@/components/shared/DashboardSkeleton';

interface ScoreData {
    score: number;
    tier: string;
    nextTier: string | null;
    pointsToNextTier: number | null;
    breakdown: {
        baseScore: number;
        earlyReturnBonus: number;
        onTimeBonus: number;
        latePenalty: number;
        cleanStreakBonus: number;
        lostBookPenalty: number;
        unpaidFinePenalty: number;
        patternPenalty: number;
    };
    stats: {
        totalLoans: number;
        earlyReturns: number;
        onTimeReturns: number;
        lateReturns: number;
        lostBooks: number;
        consecutiveLate: number;
    };
}

const TIER_COLORS: Record<string, { stroke: string; badge: string; bar: string; label: string }> = {
    BRONZE: { stroke: '#ea580c', badge: 'bg-orange-100 text-orange-700 border-orange-200', bar: 'bg-orange-500', label: '🥉 BRONZE' },
    SILVER: { stroke: '#64748b', badge: 'bg-slate-100 text-slate-700 border-slate-200', bar: 'bg-slate-500', label: '🥈 SILVER' },
    GOLD: { stroke: '#ca8a04', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', bar: 'bg-yellow-500', label: '🥇 GOLD' },
    PLATINUM: { stroke: '#7c3aed', badge: 'bg-purple-100 text-purple-700 border-purple-200', bar: 'bg-purple-500', label: '💎 PLATINUM' },
};

const TIER_RANGES: Record<string, { start: number; end: number }> = {
    BRONZE: { start: 0, end: 40 },
    SILVER: { start: 40, end: 60 },
    GOLD: { start: 60, end: 80 },
    PLATINUM: { start: 80, end: 100 },
};

function ScoreGauge({ score, tier }: { score: number; tier: string }) {
    const r = 45;
    const cx = 60;
    const cy = 60;
    const circumference = 2 * Math.PI * r;
    const filled = circumference * 0.75 * (score / 100);
    const color = (TIER_COLORS[tier] || TIER_COLORS.BRONZE).stroke;

    return (
        <svg viewBox="0 0 120 120" className="w-28 h-28">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="10"
                strokeDasharray={`${circumference * 0.75} ${circumference}`}
                strokeLinecap="round" transform={`rotate(135, ${cx}, ${cy})`} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
                strokeDasharray={`${filled} ${circumference}`}
                strokeLinecap="round" transform={`rotate(135, ${cx}, ${cy})`} />
            <text x={cx} y={cy - 3} textAnchor="middle" fill={color} fontSize="22" fontWeight="bold">{score}</text>
            <text x={cx} y={cy + 13} textAnchor="middle" fill="#9ca3af" fontSize="10">/ 100</text>
        </svg>
    );
}

export default function StudentDashboard() {
    const { user } = useAuthStore();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [scoreData, setScoreData] = useState<ScoreData | null>(null);
    const [scoreLoading, setScoreLoading] = useState(true);

    useEffect(() => {
        fetchLoans();
        fetchScore();
    }, []);

    const fetchLoans = async () => {
        try {
            const { data } = await api.get('/loans/my-loans');
            if (data.success) setLoans(data.loans);
        } catch {
            toast.error('Failed to load your dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchScore = async () => {
        try {
            const { data } = await api.get('/scores/my-score');
            if (data.success) setScoreData(data);
        } catch {
            // score card silently fails — non-critical
        } finally {
            setScoreLoading(false);
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
        if (daysLeft <= 3) return { color: 'border-orange-200 bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-600 text-white' };
        if (daysLeft <= 7) return { color: 'border-yellow-200 bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-600 text-white' };
        return { color: 'border-green-200 bg-green-50', text: 'text-green-700', badge: 'bg-green-600 text-white' };
    };

    if (loading) return <StudentDashboardSkeleton />;

    const tierInfo = TIER_COLORS[scoreData?.tier || 'BRONZE'] || TIER_COLORS.BRONZE;
    const tierRange = TIER_RANGES[scoreData?.tier || 'BRONZE'] || TIER_RANGES.BRONZE;
    const tierProgress = scoreData
        ? Math.min(100, Math.round(((scoreData.score - tierRange.start) / (tierRange.end - tierRange.start)) * 100))
        : 0;

    const breakdownItems = scoreData ? [
        { key: 'baseScore', label: 'Base', value: scoreData.breakdown.baseScore },
        { key: 'earlyReturnBonus', label: 'Early', value: scoreData.breakdown.earlyReturnBonus },
        { key: 'onTimeBonus', label: 'On-time', value: scoreData.breakdown.onTimeBonus },
        { key: 'cleanStreakBonus', label: 'Streak', value: scoreData.breakdown.cleanStreakBonus },
        { key: 'latePenalty', label: 'Late', value: scoreData.breakdown.latePenalty },
        { key: 'lostBookPenalty', label: 'Lost Book', value: scoreData.breakdown.lostBookPenalty },
        { key: 'unpaidFinePenalty', label: 'Unpaid Fine', value: scoreData.breakdown.unpaidFinePenalty },
        { key: 'patternPenalty', label: 'Pattern', value: scoreData.breakdown.patternPenalty },
    ].filter(item => item.value !== 0) : [];

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

            {/* Reader Score Card */}
            {scoreLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-5 bg-gray-200 rounded w-32" />
                        <div className="h-4 bg-gray-200 rounded w-24" />
                    </div>
                    <div className="flex items-start gap-6">
                        <div className="w-28 h-28 rounded-full bg-gray-200 shrink-0" />
                        <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-4 gap-3">
                                {[0, 1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-200 rounded-lg" />)}
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-full" />
                            <div className="flex gap-2">
                                {[0, 1, 2].map(i => <div key={i} className="h-6 bg-gray-200 rounded-md w-20" />)}
                            </div>
                        </div>
                    </div>
                </div>
            ) : scoreData ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-gray-700" />
                            <h2 className="text-xl font-bold text-gray-900">Reader Score</h2>
                        </div>
                        <Link
                            href="/student/score"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            View Full Score <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {/* Gauge + tier badge */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                            <ScoreGauge score={scoreData.score} tier={scoreData.tier} />
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${tierInfo.badge}`}>
                                {tierInfo.label}
                            </span>
                        </div>

                        {/* Right content */}
                        <div className="flex-1 w-full space-y-4">
                            {/* Quick stats */}
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { label: 'Total', value: scoreData.stats.totalLoans },
                                    { label: 'Early', value: scoreData.stats.earlyReturns },
                                    { label: 'On-time', value: scoreData.stats.onTimeReturns },
                                    { label: 'Late', value: scoreData.stats.lateReturns },
                                ].map(stat => (
                                    <div key={stat.label} className="text-center bg-gray-50 rounded-lg p-2.5">
                                        <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                                        <p className="text-xs text-gray-500">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Progress to next tier */}
                            {scoreData.tier !== 'PLATINUM' && scoreData.nextTier ? (
                                <div>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                        <span className="font-medium">Progress to {scoreData.nextTier}</span>
                                        <span>{scoreData.pointsToNextTier} pts needed</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${tierInfo.bar}`}
                                            style={{ width: `${tierProgress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-purple-600 font-semibold">🎉 You've reached the highest tier!</p>
                            )}

                            {/* Score breakdown chips */}
                            {breakdownItems.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {breakdownItems.map(item => (
                                        <span
                                            key={item.key}
                                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${item.value > 0
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-red-50 text-red-700 border border-red-200'
                                                }`}
                                        >
                                            {item.value > 0 ? '+' : ''}{item.value} {item.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}

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
