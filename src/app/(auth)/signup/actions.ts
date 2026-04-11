'use server';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '@/lib/server/db';
import { sendVerificationEmail } from '@/lib/server/email';
import { headers } from 'next/headers';

export async function signup(
	_prevState: { error?: string; success?: boolean } | null,
	formData: FormData
) {
	const email = (formData.get('email') as string)?.trim().toLowerCase();
	const password = formData.get('password') as string;
	const confirmPassword = formData.get('confirmPassword') as string;

	if (!email || !password || !confirmPassword) {
		return { error: 'All fields are required.' };
	}
	if (password.length < 8) {
		return { error: 'Password must be at least 8 characters.' };
	}
	if (password !== confirmPassword) {
		return { error: 'Passwords do not match.' };
	}

	const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
	if (existing.rows.length > 0) {
		return { error: 'An account with this email already exists.' };
	}

	const passwordHash = await bcrypt.hash(password, 12);
	const userId = crypto.randomUUID();
	await pool.query(
		'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
		[userId, email, passwordHash]
	);

	const token = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
	await pool.query(
		'INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
		[crypto.randomUUID(), userId, token, expiresAt]
	);

	try {
		const headersList = await headers();
		const origin = headersList.get('origin') || headersList.get('x-forwarded-host') || '';
		const protocol = headersList.get('x-forwarded-proto') || 'https';
		const baseUrl = origin.startsWith('http') ? origin : `${protocol}://${origin}`;
		await sendVerificationEmail(email, token, baseUrl);
	} catch (e) {
		console.error('Failed to send verification email:', e);
		return { error: 'Account created but we could not send the verification email. Please try again.' };
	}

	return { success: true };
}
