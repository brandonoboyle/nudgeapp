'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState, Suspense, type FormEvent } from 'react';
import Link from 'next/link';
import styles from '../auth.module.css';

const ERROR_MESSAGES: Record<string, string> = {
	CredentialsSignin: 'Invalid email or password.',
	EmailNotVerified: 'Please verify your email before signing in.',
	Default: 'Something went wrong. Please try again.'
};

function LoginForm() {
	const searchParams = useSearchParams();
	const urlError = searchParams.get('error');
	const verified = searchParams.get('verified') === 'true';

	const [error, setError] = useState<string | null>(
		urlError ? (ERROR_MESSAGES[urlError] ?? ERROR_MESSAGES.Default) : null
	);
	const [loading, setLoading] = useState(false);
	const [guestLoading, setGuestLoading] = useState(false);

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		const formData = new FormData(e.currentTarget);

		const result = await signIn('credentials', {
			email: formData.get('email') as string,
			password: formData.get('password') as string,
			redirect: false
		});

		if (result?.error) {
			setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.Default);
			setLoading(false);
		} else {
			window.location.href = '/app';
		}
	}

	async function handleGuestSignIn() {
		setGuestLoading(true);
		setError(null);
		const result = await signIn('guest', { redirect: false });
		if (result?.error) {
			setError(ERROR_MESSAGES.Default);
			setGuestLoading(false);
		} else {
			window.location.href = '/app';
		}
	}

	return (
		<div className={styles.form}>
			<form className={styles.form} onSubmit={handleSubmit}>
				{verified && (
					<p className={styles.verified}>Email verified! You can now sign in.</p>
				)}

				{error && <p className={styles.error}>{error}</p>}

				<div className={styles.field}>
					<label className={styles.label} htmlFor="email">Email</label>
					<input
						className={styles.input}
						id="email"
						name="email"
						type="email"
						autoComplete="email"
						required
					/>
				</div>

				<div className={styles.field}>
					<label className={styles.label} htmlFor="password">Password</label>
					<input
						className={styles.input}
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
					/>
				</div>

				<button className={styles.submit} type="submit" disabled={loading}>
					{loading ? 'Signing in...' : 'Sign in'}
				</button>
			</form>

			<div className={styles.divider}>
				<span>or</span>
			</div>

			<button
				className={styles.guestButton}
				onClick={handleGuestSignIn}
				disabled={guestLoading}
			>
				{guestLoading ? 'Starting guest session...' : 'Try as Guest'}
			</button>
		</div>
	);
}

export default function LoginPage() {
	return (
		<div className={styles.page}>
			<div className={styles.card}>
				<div className={styles.logoBlock}>
					<span className={styles.logo}>Nudge</span>
					<span className={styles.tagline}>a writing companion</span>
				</div>

				<Suspense>
					<LoginForm />
				</Suspense>

				<p className={styles.footerLink}>
					Don&apos;t have an account? <Link href="/signup">Create one</Link>
				</p>
			</div>
		</div>
	);
}
