'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { BookOpen, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export default function RegisterPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: { preventDefault(): void }) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const { data } = await api.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: 'STUDENT',
            });

            if (data.success) {
                setSuccess(true);
                setTimeout(() => router.push('/auth/login'), 2000);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "block w-full pl-10 pr-3 py-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition";

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:flex-1 bg-linear-to-br from-primary to-primary/80 items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />

                <div className="relative z-10 max-w-md text-primary-foreground">
                    <BookOpen className="w-16 h-16 mb-6" />
                    <h2 className="text-4xl font-bold mb-4">Join LibraIQ Today</h2>
                    <p className="text-xl text-primary-foreground/70 mb-8">
                        Create your account and discover a smarter way to manage your reading journey.
                    </p>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                        <p className="text-sm text-primary-foreground/70">
                            "LibraIQ transformed how we manage our library. The trust tier system encourages responsible borrowing!"
                        </p>
                        <p className="mt-3 font-semibold">— Sarah K., Librarian</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="flex-1 flex items-center justify-center p-8 relative">
                <div className="absolute top-4 right-4">
                    <ThemeToggle />
                </div>
                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-6 lg:hidden">
                            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center shrink-0">
                                <BookOpen className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">LibraIQ</h1>
                                <p className="text-sm text-muted-foreground">Library Management System</p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-2">Create account</h2>
                            <p className="text-muted-foreground">Start your reading journey with us</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start gap-3 dark:bg-green-950/30 dark:border-green-900">
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-green-800 dark:text-green-400">Account created! Redirecting to login...</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                                Full name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                Email address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className={`${inputClass} pr-10`}
                                    placeholder="At least 6 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                                Confirm password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                    placeholder="Confirm your password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || success}
                            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-md font-medium cursor-pointer hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    <span>Creating account...</span>
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Account created!</span>
                                </>
                            ) : (
                                <>
                                    <span>Create account</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="font-medium text-primary hover:text-primary/80 transition">
                            Sign in Instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
