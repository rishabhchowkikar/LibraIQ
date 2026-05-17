'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { BookOpen, LogOut, LayoutDashboard, BookMarked, Menu, X, User } from 'lucide-react';

export default function StudentNavbar() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            logout();
            router.push('/auth/login');
        }
    };

    const navigation = [
        { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
        { name: 'My Loans', href: '/student/loans', icon: BookMarked },
    ];

    const getTierBadge = (tier: string) => {
        const badges: Record<string, { bg: string; text: string; icon: string }> = {
            BRONZE: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🥉' },
            SILVER: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '🥈' },
            GOLD: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🥇' },
            PLATINUM: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '💎' },
        };
        return badges[tier] || badges.BRONZE;
    };

    const tierBadge = getTierBadge(user?.trustTier || 'BRONZE');

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left: Logo & Navigation */}
                    <div className="flex items-center">
                        <Link href="/student/dashboard" className="flex items-center gap-2 mr-8">
                            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900">LibraIQ</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex md:space-x-1">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right: User Info & Actions */}
                    <div className="flex items-center gap-3">
                        {/* Trust Tier Badge */}
                        <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${tierBadge.bg} border border-gray-200`}>
                            <span className="text-sm">{tierBadge.icon}</span>
                            <span className={`text-xs font-semibold ${tierBadge.text} capitalize`}>
                                {user?.trustTier.toLowerCase()}
                            </span>
                        </div>

                        {/* User Info */}
                        <div className="hidden md:flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                                <User className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 bg-white">
                    <div className="px-4 py-3 space-y-1">
                        {/* User info mobile */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${tierBadge.bg} mt-1`}>
                                    <span className="text-xs">{tierBadge.icon}</span>
                                    <span className={`text-xs font-semibold ${tierBadge.text} capitalize`}>
                                        {user?.trustTier.toLowerCase()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation links */}
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        ))}

                        {/* Logout */}
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false);
                                handleLogout();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}