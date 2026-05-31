'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { useEffect, useState } from 'react';
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
    LayoutDashboard, BookMarked, BookOpen,
    LogOut, ChevronUp, Award, Receipt, Bell,
    CreditCard
} from 'lucide-react';

const navigation = [
    { title: 'Dashboard', url: '/student/dashboard', icon: LayoutDashboard },
    { title: 'My Loans', url: '/student/loans', icon: BookMarked },
    { title: 'My Fines', url: '/student/fines', icon: Receipt },
    { title: "Payments", url: '/student/payments', icon: CreditCard },
    { title: 'Notifications', url: '/student/notifications', icon: Bell },
];

const tierConfig: Record<string, { label: string; class: string }> = {
    BRONZE: { label: '🥉 Bronze', class: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    SILVER: { label: '🥈 Silver', class: 'bg-slate-400/20 text-slate-300 border-slate-400/30' },
    GOLD: { label: '🥇 Gold', class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    PLATINUM: { label: '💎 Platinum', class: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
};

export function StudentSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const { data } = await api.get('/notifications?unreadOnly=true&limit=1');
                if (data.success) setUnreadCount(data.unreadCount);
            } catch { }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch { }
        logout();
        router.push('/auth/login');
    };

    const tier = tierConfig[user?.trustTier || 'BRONZE'];
    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-md">
                        <BookOpen className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="group-data-[collapsible=icon]:hidden">
                        <p className="font-bold text-sidebar-foreground text-base">LibraIQ</p>
                        <p className="text-xs text-sidebar-foreground/50">Student Portal</p>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarSeparator className='m-0' />

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-wider">
                        Navigation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigation.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                        className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                                    >
                                        <Link href={item.url} className="flex items-center gap-2">
                                            <item.icon className="w-4 h-4" />
                                            <span>{item.title}</span>
                                            {item.title === 'Notifications' && unreadCount > 0 && (
                                                <Badge className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                                                    {unreadCount > 9 ? '9+' : unreadCount}
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
                    <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-wider">
                        Your Status
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <div className="px-2 py-1">
                            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Award className="w-4 h-4 text-sidebar-foreground/50" />
                                    <span className="text-xs text-sidebar-foreground/50 font-medium">Trust Tier</span>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${tier.class}`}>
                                    {tier.label}
                                </span>
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
                                <SidebarMenuButton className="h-auto text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" tooltip={user?.name}>
                                    <Avatar className="h-8 w-8 flex-shrink-0">
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