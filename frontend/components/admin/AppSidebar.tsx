'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
    SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    LayoutDashboard, Library, FileText, CreditCard,
    LogOut, ChevronUp, Shield, Receipt, TrendingUp,
    BarChart3, ClipboardList, BookMarked, Clock, CalendarClock,
} from 'lucide-react';

const navigation = [
    { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Books', url: '/admin/books', icon: Library },
    { title: 'Loans', url: '/admin/loans', icon: FileText },
    { title: 'Reservations', url: '/admin/reservations', icon: Clock },
    { title: 'Extensions', url: '/admin/extensions', icon: CalendarClock },
    { title: 'Fines', url: '/admin/fines', icon: Receipt },
    { title: 'Payments', url: '/admin/payments', icon: CreditCard },
    { title: 'Scores', url: '/admin/scores', icon: TrendingUp },
    { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
    { title: 'Audit Logs', url: '/admin/audit-logs', icon: ClipboardList },
    { title: 'Requests', url: '/admin/book-requests', icon: BookMarked },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingExtensions, setPendingExtensions] = useState(0);

    useEffect(() => {
        api.get('/book-requests')
            .then(({ data }) => { if (data.success) setPendingCount(data.pendingCount ?? 0); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        api.get('/extensions?status=PENDING')
            .then(({ data }) => { if (data.success) setPendingExtensions(data.pendingCount ?? 0); })
            .catch(() => {});
    }, []);

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch { }
        logout();
        router.push('/auth/login');
    };

    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A';

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="px-5 py-5.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
                <div className="flex items-center gap-2.75 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                    <div className="w-9.5 h-9.5 rounded-md bg-primary flex items-center justify-center shrink-0 font-heading text-lg font-semibold text-primary-foreground">
                        Li
                    </div>
                    <div className="group-data-[collapsible=icon]:hidden">
                        <p className="font-heading text-sidebar-foreground text-[19px] font-semibold tracking-tight leading-none">LibraIQ</p>
                        <p className="text-[11px] text-sidebar-foreground/50 mt-1">Management Portal</p>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarSeparator className='m-0' />

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10.5px] uppercase tracking-[0.14em] font-semibold px-3">
                        Management
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigation.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                        className="relative text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium"
                                    >
                                        <Link href={item.url}>
                                            {pathname === item.url && (
                                                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.75 h-4.5 rounded-r-sm bg-primary group-data-[collapsible=icon]:hidden" />
                                            )}
                                            <item.icon className="w-4 h-4 shrink-0" />
                                            <span>{item.title}</span>
                                            {item.title === 'Requests' && pendingCount > 0 && (
                                                <Badge className="ml-auto h-5 min-w-5 rounded-full px-1 flex items-center justify-center text-[10px] bg-red-500 text-white border-0 group-data-[collapsible=icon]:hidden">
                                                    {pendingCount > 9 ? '9+' : pendingCount}
                                                </Badge>
                                            )}
                                            {item.title === 'Extensions' && pendingExtensions > 0 && (
                                                <Badge className="ml-auto h-5 min-w-5 rounded-full px-1 flex items-center justify-center text-[10px] bg-red-500 text-white border-0 group-data-[collapsible=icon]:hidden">
                                                    {pendingExtensions > 9 ? '9+' : pendingExtensions}
                                                </Badge>
                                            )}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarGroupContent>
                        <div className="px-2 py-1">
                            <div className="rounded-md border border-sidebar-border bg-sidebar-accent/50 p-3 flex items-center gap-2.5">
                                <Shield className="w-4 h-4 text-primary" />
                                <div>
                                    <p className="text-xs font-semibold text-sidebar-foreground">Administrator</p>
                                    <p className="text-xs text-sidebar-foreground/40">Full access</p>
                                </div>
                            </div>
                        </div>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton className="h-auto py-2.5 group-data-[collapsible=icon]:justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" tooltip={user?.name}>
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
                                        <p className="text-sm font-semibold truncate text-sidebar-foreground">{user?.name}</p>
                                        <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
                                    </div>
                                    <ChevronUp className="w-4 h-4 group-data-[collapsible=icon]:hidden" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" className="w-56" align="start">
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive gap-2">
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}