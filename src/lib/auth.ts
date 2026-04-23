import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/server/db';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
	...authConfig,
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
		}),
		Credentials({
			id: 'guest',
			name: 'Guest',
			credentials: {},
			async authorize() {
				const guestId = crypto.randomUUID();
				return { id: guestId, email: `guest-${guestId}@guest.nudge.app`, name: 'Guest' };
			}
		})
	],
});
