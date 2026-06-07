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
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    LayoutDashboard, Library, FileText, CreditCard,
    BookOpen, LogOut, ChevronUp, Shield, Receipt, TrendingUp,
} from 'lucide-react';

const navigation = [
    { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Books', url: '/admin/books', icon: Library },
    { title: 'Loans', url: '/admin/loans', icon: FileText },
    { title: 'Fines', url: '/admin/fines', icon: Receipt },
    { title: 'Scores', url: '/admin/scores', icon: TrendingUp },
    { title: 'Payments', url: '/admin/payments', icon: CreditCard },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch { }
        logout();
        router.push('/auth/login');
    };

    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A';

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="px-4 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
                        <BookOpen className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-sidebar-foreground text-base">LibraIQ</p>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                                Admin
                            </span>
                        </div>
                        <p className="text-xs text-sidebar-foreground/50">Management Portal</p>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarSeparator className='m-0' />

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-wider">
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
                                        className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
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

                <SidebarSeparator />

                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarGroupContent>
                        <div className="px-2 py-1">
                            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 flex items-center gap-2.5">
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
                                <SidebarMenuButton className="h-auto py-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" tooltip={user?.name}>
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