'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    Bell, Clock, AlertCircle, CheckCircle2,
    Award, BookOpen, Info, CheckCheck, ChevronDown, ChevronUp,
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
                    {Array.from({ length: 4 }).map((_, i) => (
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

const typeConfig: Record<string, {
    icon: any;
    color: string;
    bg: string;
    label: string;
    borderColor: string;
}> = {
    DUE_REMINDER: {
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        label: 'Due Reminder',
        borderColor: 'border-amber-200',
    },
    OVERDUE_ALERT: {
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'Overdue Alert',
        borderColor: 'border-red-200',
    },
    FINE_ALERT: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'Fine Update',
        borderColor: 'border-green-200',
    },
    TIER_CHANGE: {
        icon: Award,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        label: 'Tier Change',
        borderColor: 'border-purple-200',
    },
    RESERVATION_AVAILABLE: {
        icon: BookOpen,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'Book Available',
        borderColor: 'border-blue-200',
    },
    GENERAL: {
        icon: Info,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'General',
        borderColor: 'border-gray-200',
    },
};

const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications?limit=50');
            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        // Toggle expand
        setExpandedId(prev => prev === notification.id ? null : notification.id);

        // Mark as read if unread
        if (!notification.isRead) {
            try {
                await api.patch(`/notifications/${notification.id}/read`);
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch { }
        }
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm relative">
                        <Bell className="w-5 h-5 text-primary-foreground" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-background">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                        <p className="text-sm text-muted-foreground">
                            {unreadCount > 0
                                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                                : 'All caught up'}
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
            <div className="space-y-2">
                {notifications.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-muted-foreground">No notifications yet</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">
                                We'll notify you about due dates, fines, and more
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    notifications.map((notification) => {
                        const config = typeConfig[notification.type] || typeConfig.GENERAL;
                        const Icon = config.icon;
                        const isExpanded = expandedId === notification.id;

                        return (
                            <div
                                key={notification.id}
                                className={`
                  rounded-xl border transition-all duration-200 overflow-hidden
                  ${!notification.isRead
                                        ? `${config.borderColor} bg-primary/5`
                                        : 'border-border bg-background'
                                    }
                  ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}
                `}
                            >
                                {/* Notification Row — always visible */}
                                <div
                                    onClick={() => handleNotificationClick(notification)}
                                    className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
                                >
                                    {/* Icon */}
                                    <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-snug line-clamp-2 ${!notification.isRead ? 'font-semibold' : ''}`}>
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px] px-1.5 py-0 h-4 font-normal"
                                            >
                                                {config.label}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {getTimeAgo(notification.sentAt)}
                                            </span>
                                            {!notification.isRead && (
                                                <span className="text-xs text-primary font-medium">• New</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expand indicator */}
                                    <div className="flex-shrink-0 mt-1">
                                        {isExpanded
                                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        }
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <>
                                        <Separator />
                                        <div className="px-4 py-4 bg-muted/20">
                                            {/* Full message */}
                                            <div className="flex items-start gap-2 mb-4">
                                                <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className={`w-4 h-4 ${config.color}`} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                                        {config.label}
                                                    </p>
                                                    <p className="text-sm leading-relaxed">{notification.message}</p>
                                                </div>
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex items-center justify-between text-xs text-muted-foreground bg-background rounded-lg px-3 py-2 border">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        {new Date(notification.sentAt).toLocaleDateString('en-IN', {
                                                            weekday: 'short',
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })} at {new Date(notification.sentAt).toLocaleTimeString('en-IN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {notification.isRead
                                                        ? <><CheckCheck className="w-3 h-3 text-green-500" /><span className="text-green-600">Read</span></>
                                                        : <><div className="w-2 h-2 bg-primary rounded-full" /><span className="text-primary">Unread</span></>
                                                    }
                                                </div>
                                            </div>

                                            {/* Collapse button */}
                                            <button
                                                onClick={() => setExpandedId(null)}
                                                className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-1"
                                            >
                                                <ChevronUp className="w-3 h-3" />
                                                Collapse
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {notifications.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    Showing last {notifications.length} notification{notifications.length > 1 ? 's' : ''}
                </p>
            )}
        </div>
    );
}