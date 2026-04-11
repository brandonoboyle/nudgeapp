'use server';

import { pool } from '@/lib/server/db';

export async function verifyToken(token: string): Promise<'success' | 'expired' | 'invalid'> {
	if (!token) return 'invalid';

	const result = await pool.query(
		`SELECT t.user_id, t.expires_at
		 FROM email_verification_tokens t
		 WHERE t.token = $1`,
		[token]
	);

	if (result.rows.length === 0) return 'invalid';

	const { user_id, expires_at } = result.rows[0];

	if (new Date(expires_at) < new Date()) return 'expired';

	await pool.query('UPDATE users SET "emailVerified" = NOW() WHERE id = $1', [user_id]);
	await pool.query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);

	return 'success';
}
