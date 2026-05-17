'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { AdminSidebar } from '@/components/admin/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, _hasHydrated, _isRestoring, restoreSession } = useAuthStore();
    const restoreAttempted = useRef(false);

    useEffect(() => {
        if (!_hasHydrated || _isRestoring) return;

        if (!user) {
            if (restoreAttempted.current) {
                router.replace('/auth/login');
                return;
            }
            restoreAttempted.current = true;
            restoreSession();
            return;
        }

        if (user.role !== 'ADMIN') router.replace('/student/dashboard');
    }, [user, _hasHydrated, _isRestoring, router, restoreSession]);

    if (!_hasHydrated || _isRestoring) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!user || user.role !== 'ADMIN') return null;

    return (
        <TooltipProvider>
            <SidebarProvider>
                <div className="flex min-h-screen w-full bg-muted/30">
                    <AdminSidebar />
                    <div className="flex-1 flex flex-col min-w-0">
                        <header className="h-14 bg-background border-b flex items-center gap-3 px-4 sticky top-0 z-40">
                            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                            <Separator orientation="vertical" className="h-full" />
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Admin Panel</span>
                                <span className="text-muted-foreground">—</span>
                                <span className="font-semibold">{user.name}</span>
                            </div>
                            <div className="ml-auto">
                                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 text-xs">
                                    Administrator
                                </Badge>
                            </div>
                        </header>
                        <main className="flex-1 p-6">
                            {children}
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        </TooltipProvider>
    );
}