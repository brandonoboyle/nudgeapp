import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/server/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
	secret: process.env.AUTH_SECRET,
	session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
	providers: [
		Credentials({
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null;
				const result = await pool.query('SELECT * FROM users WHERE email = $1', [
					credentials.email
				]);
				const user = result.rows[0];
				if (!user?.password_hash) return null;
				const valid = await bcrypt.compare(credentials.password as string, user.password_hash);
				if (!valid) return null;
				if (!user.emailVerified) throw new Error('EmailNotVerified');
				return { id: user.id, email: user.email, name: user.name };
			}
		})
	],
	pages: { signIn: '/login' },
	trustHost: true
});
