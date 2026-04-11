'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signup } from './actions';
import styles from '../auth.module.css';

export default function SignupPage() {
	const [state, formAction, pending] = useActionState(signup, null);

	if (state?.success) {
		return (
			<div className={styles.page}>
				<div className={styles.card}>
					<div className={styles.logoBlock}>
						<span className={styles.logo}>Nudge</span>
						<span className={styles.tagline}>a writing companion</span>
					</div>

					<div className={styles.messageBlock}>
						<p className={styles.heading}>Check your email</p>
						<p className={styles.body}>
							We sent a verification link to your inbox. Click it to activate your
							account, then sign in.
						</p>
						<Link href="/login" className={styles.actionLink}>
							Go to sign in
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<div className={styles.card}>
				<div className={styles.logoBlock}>
					<span className={styles.logo}>Nudge</span>
					<span className={styles.tagline}>a writing companion</span>
				</div>

				<form className={styles.form} action={formAction}>
					{state?.error && <p className={styles.error}>{state.error}</p>}

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
							autoComplete="new-password"
							minLength={8}
							required
						/>
					</div>

					<div className={styles.field}>
						<label className={styles.label} htmlFor="confirmPassword">Confirm password</label>
						<input
							className={styles.input}
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							autoComplete="new-password"
							minLength={8}
							required
						/>
					</div>

					<button className={styles.submit} type="submit" disabled={pending}>
						{pending ? 'Creating account...' : 'Create account'}
					</button>
				</form>

				<p className={styles.footerLink}>
					Already have an account? <Link href="/login">Sign in</Link>
				</p>
			</div>
		</div>
	);
}
