'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Loan, LoanExtension } from '@/lib/type';
import {
    CalendarClock, Clock, CheckCircle2, XCircle, BookOpen,
} from 'lucide-react';

function statusConfig(status: LoanExtension['status']) {
    switch (status) {
        case 'PENDING':
            return { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400', icon: Clock, label: 'Awaiting review' };
        case 'APPROVED':
            return { bg: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400', icon: CheckCircle2, label: 'Approved' };
        default:
            return { bg: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400', icon: XCircle, label: 'Rejected' };
    }
}

export default function StudentExtensionsPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [extensions, setExtensions] = useState<LoanExtension[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestingId, setRequestingId] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [loansRes, extensionsRes] = await Promise.all([
                api.get('/loans/my-loans'),
                api.get('/extensions/my-extensions'),
            ]);
            if (loansRes.data.success) setLoans(loansRes.data.loans);
            if (extensionsRes.data.success) setExtensions(extensionsRes.data.extensions);
        } catch {
            toast.error('Failed to load extensions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const loanIdsWithExtension = new Set(extensions.map(e => e.loanId));
    const eligibleLoans = loans.filter(
        (l) => l.status === 'ACTIVE' && !loanIdsWithExtension.has(l.id)
    );

    const handleRequest = async (loan: Loan) => {
        setRequestingId(loan.id);
        try {
            const { data } = await api.post('/extensions', { loanId: loan.id });
            toast.success(data.message || 'Extension requested');
            await fetchAll();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to request extension');
        } finally {
            setRequestingId(null);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-12 w-64 bg-muted rounded-md" />
                    <div className="h-40 bg-muted rounded-lg" />
                    <div className="h-40 bg-muted rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center shrink-0">
                        <CalendarClock className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Loan Extensions</h1>
                        <p className="text-muted-foreground">Request 7 extra days on an active loan (once per loan)</p>
                    </div>
                </div>
            </div>

            {/* Eligible loans */}
            <div className="bg-card rounded-lg border border-border p-6 mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4">Eligible for Extension</h2>

                {eligibleLoans.length === 0 ? (
                    <div className="text-center py-10">
                        <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium text-sm">
                            No active loans are currently eligible for an extension
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Each loan can only be extended once, and only if no one else has reserved the book
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {eligibleLoans.map((loan) => (
                            <div key={loan.id} className="flex items-center justify-between gap-4 border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-foreground truncate">{loan.book?.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        by {loan.book?.author} · Due {new Date(loan.dueDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRequest(loan)}
                                    disabled={requestingId === loan.id}
                                    className="px-4 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                                >
                                    {requestingId === loan.id ? 'Requesting...' : 'Request Extension'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* My extension requests */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">My Requests</h2>

                {extensions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarClock className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-foreground font-medium mb-1">No extension requests yet</p>
                        <p className="text-sm text-muted-foreground">Request one above for an active loan</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {extensions.map((ext) => {
                            const config = statusConfig(ext.status);
                            const StatusIcon = config.icon;
                            return (
                                <div key={ext.id} className="border border-border rounded-lg p-5">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-foreground truncate">{ext.loan?.book?.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-3">by {ext.loan?.book?.author}</p>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`px-3 py-1 rounded-md font-semibold text-xs flex items-center gap-1.5 ${config.bg}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {config.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Requested {new Date(ext.requestedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {ext.status === 'APPROVED' && (
                                                <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                                                    New due date: {new Date(ext.newDueDate).toLocaleDateString()}
                                                </p>
                                            )}
                                            {ext.status === 'REJECTED' && ext.adminNote && (
                                                <blockquote className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md px-3 py-2 text-sm text-red-800 dark:text-red-400 mt-2">
                                                    Reason: {ext.adminNote}
                                                </blockquote>
                                            )}
                                        </div>
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
