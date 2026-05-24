'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    Bell, Clock, AlertCircle, CheckCircle2,
    Award, BookOpen, Info, CheckCheck,
} from 'lucide-react';

interface Notification {
    id: string;
    type: string;
    message: string;
    isRead: boolean;
    sentAt: string;
}

function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                </div>
                <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
            <Card>
                <CardContent className="pt-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                            <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    DUE_REMINDER: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Due Reminder' },
    OVERDUE_ALERT: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Overdue Alert' },
    FINE_ALERT: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Fine Update' },
    TIER_CHANGE: { icon: Award, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Tier Change' },
    RESERVATION_AVAILABLE: { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Book Available' },
    RESERVATION_EXPIRING: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Reservation Expiring' },
    GENERAL: { icon: Info, color: 'text-gray-600', bg: 'bg-gray-100', label: 'General' },
};

const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications?limit=50');
            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (err) {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { }
    };

    const markAllAsRead = async () => {
        setMarkingAll(true);
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch {
            toast.error('Failed to mark all as read');
        } finally {
            setMarkingAll(false);
        }
    };

    if (loading) return <PageSkeleton />;

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm relative">
                        <Bell className="w-5 h-5 text-primary-foreground" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                        <p className="text-sm text-muted-foreground">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={markAllAsRead}
                        disabled={markingAll}
                        className="gap-2"
                    >
                        <CheckCheck className="w-4 h-4" />
                        {markingAll ? 'Marking...' : 'Mark all read'}
                    </Button>
                )}
            </div>

            {/* Notifications List */}
            <Card className="shadow-sm">
                {notifications.length === 0 ? (
                    <CardContent className="py-16 text-center">
                        <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-muted-foreground">No notifications yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            We'll notify you about due dates, fines, and more
                        </p>
                    </CardContent>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notification) => {
                            const config = typeConfig[notification.type] || typeConfig.GENERAL;
                            const Icon = config.icon;

                            return (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                                    className={`flex items-start gap-3 px-5 py-4 transition-colors cursor-pointer ${!notification.isRead
                                            ? 'bg-primary/5 hover:bg-primary/8'
                                            : 'hover:bg-muted/30'
                                        }`}
                                >
                                    {/* Icon */}
                                    <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-snug ${!notification.isRead ? 'font-semibold' : 'font-normal'}`}>
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                        {config.label}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {getTimeAgo(notification.sentAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Unread indicator */}
                                            {!notification.isRead && (
                                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {notifications.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    Showing last {notifications.length} notifications
                </p>
            )}
        </div>
    );
}