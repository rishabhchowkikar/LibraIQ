'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/shared/Logo';
import { BookOpen, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Shield, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            if (data.success) {
                setAuth(data.user, data.accessToken);
                router.push(data.user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <Logo />
                    {/* Header */}
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-muted-foreground mt-2">Sign in to access your account</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 py-5 pr-5"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9 py-5 pr-5"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-lg font-medium cursor-pointer hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" disabled={loading}>
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Sign in <ArrowRight className="w-4 h-4" />
                                </div>
                            )}
                        </Button>
                    </form>

                    {/* Test accounts */}
                    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-semibold">Test Accounts</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between bg-background rounded-md px-3 py-2 text-sm">
                                <span className="text-muted-foreground font-medium">Admin:</span>
                                <code className="text-xs">admin@libraiq.com / admin123</code>
                            </div>
                            <div className="flex items-center justify-between bg-background rounded-md px-3 py-2 text-sm">
                                <span className="text-muted-foreground font-medium">Student:</span>
                                <code className="text-xs">arjun@student.com / password123</code>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link href="/auth/register" className="font-semibold text-blue-600 hover:underline">
                            Create one now
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right - Branding */}
            <div className="hidden lg:flex flex-1 bg-blue-600 items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative z-10 max-w-md text-white space-y-8">
                    <BookOpen className="w-16 h-16 opacity-90" />
                    <div>
                        <h2 className="text-4xl font-bold mb-4">Intelligent Library Management</h2>
                        <p className="text-blue-100 text-lg">Track books, manage loans, and build a thriving reading community with AI-powered insights.</p>
                    </div>
                    <div className="space-y-4">
                        {[
                            { title: 'Smart Trust System', desc: 'Reward responsible readers with tiered privileges' },
                            { title: 'Automated Reminders', desc: 'Never miss a due date with intelligent notifications' },
                            { title: 'AI Recommendations', desc: 'Personalized book suggestions based on reading history' },
                        ].map((f) => (
                            <div key={f.title} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold">{f.title}</p>
                                    <p className="text-blue-100 text-sm">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}