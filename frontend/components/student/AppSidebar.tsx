'use client';

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
    LayoutDashboard, BookMarked, BookOpen,
    LogOut, Award,
} from 'lucide-react';

const navigation = [
    { title: 'Dashboard', url: '/student/dashboard', icon: LayoutDashboard },
    { title: 'My Loans', url: '/student/loans', icon: BookMarked },
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

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch { }
        logout();
        router.push('/auth/login');
    };

    const tier = tierConfig[user?.trustTier || 'BRONZE'];
    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-3">
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md">
                        <BookOpen className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="group-data-[collapsible=icon]:hidden">
                        <p className="font-bold text-sidebar-foreground text-base">LibraIQ</p>
                        <p className="text-xs text-sidebar-foreground/50">Student Portal</p>
                    </div>
                </div>
            </SidebarHeader>

            <div className='w-full bg-gray-700 h-0.25' />

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-wider">
                        Navigation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className='space-y-2'>
                            {navigation.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                        className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-primary data-[active=true]:text-primary-foreground cursor-pointer"
                                    >
                                        <Link href={item.url}>
                                            <item.icon className="w-4 h-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <div className='w-full bg-gray-700 h-0.25' />

                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-wider">
                        Your Status
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <div className="px-2 py-1">
                            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 flex items-center justify-between p-3 space-y-2">
                                <div className="flex items-center m-0 gap-2">
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

            <SidebarFooter className="border-t border-sidebar-border p-0">
                {/* User Info */}
                <div className="flex items-center gap-3 px-4 py-3 group-data-[collapsible=icon]:justify-center">
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-semibold truncate text-sidebar-foreground">{user?.name}</p>
                        <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
                    </div>
                </div>


                {/* Sign Out Button */}
                <SidebarMenu className="px-2 py-2">
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleLogout}
                            tooltip="Sign out"
                            className="text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer w-full transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}