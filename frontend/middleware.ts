import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
    const userRole = request.cookies.get('userRole')?.value;

    // Root route - redirect based on login status
    if (pathname === '/') {
        if (isLoggedIn && userRole) {
            if (userRole === 'ADMIN') {
                return NextResponse.redirect(new URL('/admin/dashboard', request.url));
            } else {
                return NextResponse.redirect(new URL('/student/dashboard', request.url));
            }
        } else {
            return NextResponse.redirect(new URL('/auth/login', request.url));
        }
    }

    // Protect student routes
    if (pathname.startsWith('/student')) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL('/auth/login', request.url));
        }
        // If logged in but wrong role
        if (userRole === 'ADMIN') {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
        return NextResponse.next();
    }

    // Protect admin routes
    if (pathname.startsWith('/admin')) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL('/auth/login', request.url));
        }
        // If logged in but wrong role
        if (userRole === 'STUDENT') {
            return NextResponse.redirect(new URL('/student/dashboard', request.url));
        }
        return NextResponse.next();
    }

    // Redirect logged-in users away from auth pages
    if (pathname.startsWith('/auth')) {
        if (isLoggedIn && userRole) {
            if (userRole === 'ADMIN') {
                return NextResponse.redirect(new URL('/admin/dashboard', request.url));
            } else {
                return NextResponse.redirect(new URL('/student/dashboard', request.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/student/:path*', '/admin/:path*', '/auth/:path*'],
};