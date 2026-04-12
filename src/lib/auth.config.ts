import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
	secret: process.env.AUTH_SECRET,
	session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
	providers: [],
	pages: { signIn: '/login' },
	trustHost: true
};
