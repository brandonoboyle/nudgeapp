import bcrypt from 'bcryptjs';
import { pool } from '@/lib/server/db';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await auth();
	if (!session?.user?.email) {
		return Response.json({ error: 'Not authenticated' }, { status: 401 });
	}

	let body: { currentPassword?: string; newPassword?: string };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { currentPassword, newPassword } = body;

	if (!currentPassword || !newPassword) {
		return Response.json({ error: 'Both current and new password are required' }, { status: 400 });
	}

	if (newPassword.length < 8) {
		return Response.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
	}

	const result = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [
		session.user.email
	]);
	const user = result.rows[0];
	if (!user) {
		return Response.json({ error: 'User not found' }, { status: 404 });
	}

	const valid = await bcrypt.compare(currentPassword, user.password_hash);
	if (!valid) {
		return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
	}

	const newHash = await bcrypt.hash(newPassword, 12);
	await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);

	return Response.json({ success: true });
}
