import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/verify-email', '/api/auth', '/api/paddle/webhook'];

function isPublic(pathname: string) {
	return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

export default auth((req) => {
	const { pathname } = req.nextUrl;
	const session = req.auth;

	// Logged-in users visiting the landing page go straight to the app
	if (session && pathname === '/') {
		return NextResponse.redirect(new URL('/app', req.url));
	}

	// Unauthenticated users on protected routes go to login
	if (!session && !isPublic(pathname)) {
		return NextResponse.redirect(new URL('/login', req.url));
	}

	const response = NextResponse.next();

	// Prevent bfcache on authenticated pages
	if (!isPublic(pathname)) {
		response.headers.set('Cache-Control', 'no-store');
	}

	// Security headers
	const isDev = process.env.NODE_ENV === 'development';
	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://cdn.paddle.com`,
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.paddle.com https://sandbox-cdn.paddle.com",
			"font-src 'self' https://fonts.gstatic.com https://cdn.paddle.com https://sandbox-cdn.paddle.com",
			"img-src 'self' data: https://paddle.s3.amazonaws.com https://cdn.paddle.com https://sandbox-cdn.paddle.com",
			"connect-src 'self' https://api.paddle.com https://sandbox-api.paddle.com https://checkout-service.paddle.com https://sandbox-checkout-service.paddle.com",
			"frame-src https://buy.paddle.com https://sandbox-buy.paddle.com https://checkout-service.paddle.com https://sandbox-checkout-service.paddle.com",
			"frame-ancestors 'none'"
		].join('; ')
	);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');

	return response;
});

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
