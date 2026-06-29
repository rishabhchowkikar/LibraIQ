'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ClipboardList, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { AuditLog } from '@/lib/type';

const ACTION_OPTIONS = [
    'LOAN_ISSUED', 'LOAN_RETURNED', 'LOAN_MARKED_LOST',
    'FINE_PAID', 'FINE_WAIVED',
    'BOOK_ADDED', 'BOOK_EDITED', 'BOOK_DELETED',
    'BOOK_REQUEST_CREATED', 'BOOK_REQUEST_APPROVED', 'BOOK_REQUEST_REJECTED',
];

const TARGET_OPTIONS = ['LOAN', 'FINE', 'BOOK', 'BOOK_REQUEST'];
const ROLE_OPTIONS = ['ADMIN', 'STUDENT'];

function actionBadgeClass(action: string) {
    if (action.startsWith('LOAN_')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (action.startsWith('FINE_')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (action.startsWith('BOOK_REQUEST_')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (action.startsWith('BOOK_')) return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
}

function relativeTime(dateStr: string) {
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
}

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <Card><CardContent className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </CardContent></Card>
        </div>
    );
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const limit = 50;

    const [action, setAction] = useState<string>('');
    const [targetType, setTargetType] = useState<string>('');
    const [actorRole, setActorRole] = useState<string>('');

    useEffect(() => { fetchLogs(); }, [page, action, targetType, actorRole]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (action) params.action = action;
            if (targetType) params.targetType = targetType;
            if (actorRole) params.actorRole = actorRole;

            const { data } = await api.get('/audit-logs', { params });
            if (data.success) {
                setLogs(data.logs);
                setTotal(data.pagination.total);
                setPages(data.pagination.pages);
            }
        } catch {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setAction('');
        setTargetType('');
        setActorRole('');
        setPage(1);
    };

    const hasFilters = !!(action || targetType || actorRole);

    if (loading && logs.length === 0) return <PageSkeleton />;

    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <ClipboardList className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-sm text-muted-foreground">Track all system activity</p>
                </div>
            </div>

            {/* Stats */}
            <Card className="shadow-sm w-fit">
                <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Logs</p>
                    <p className="text-3xl font-bold mt-1">{total}</p>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={action || 'ALL'} onValueChange={(v) => { setAction(v === 'ALL' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Action type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Actions</SelectItem>
                                {ACTION_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={targetType || 'ALL'} onValueChange={(v) => { setTargetType(v === 'ALL' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Target type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All</SelectItem>
                                {TARGET_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={actorRole || 'ALL'} onValueChange={(v) => { setActorRole(v === 'ALL' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Actor role" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All</SelectItem>
                                {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {hasFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
                                <X className="w-3.5 h-3.5" />
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="shadow-sm">
                <CardContent className="p-0">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                                <ClipboardList className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-muted-foreground">No audit logs found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Actor</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="text-sm text-muted-foreground cursor-default">
                                                        {relativeTime(log.createdAt)}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${actionBadgeClass(log.action)} hover:${actionBadgeClass(log.action)} font-medium`}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium">{log.actor?.name || '—'}</span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-1.5 ${log.actorRole === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                                                >
                                                    {log.actorRole}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{log.actor?.email}</p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="secondary" className="text-[10px]">{log.targetType}</Badge>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {log.targetId?.slice(0, 8)}...
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {log.details ? (
                                                <div className="space-y-0.5">
                                                    {Object.entries(log.details).slice(0, 3).map(([k, v]) => (
                                                        <p key={k} className="text-xs text-muted-foreground">
                                                            <span className="font-medium">{k}:</span> {String(v)}
                                                        </p>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>

                {logs.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t">
                        <p className="text-xs text-muted-foreground">
                            Showing <strong>{from}-{to}</strong> of <strong>{total}</strong> logs
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline" size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="gap-1"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Previous
                            </Button>
                            <Button
                                variant="outline" size="sm"
                                disabled={page >= pages}
                                onClick={() => setPage(p => Math.min(pages, p + 1))}
                                className="gap-1"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
