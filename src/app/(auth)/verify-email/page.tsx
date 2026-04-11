'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { verifyToken } from './actions';
import styles from '../auth.module.css';

type Status = 'loading' | 'success' | 'expired' | 'invalid';

function VerifyEmailContent() {
	const searchParams = useSearchParams();
	const token = searchParams.get('token');
	const [status, setStatus] = useState<Status>(token ? 'loading' : 'invalid');

	useEffect(() => {
		if (!token) return;
		verifyToken(token).then(setStatus);
	}, [token]);

	return (
		<>
			{status === 'loading' && (
				<div className={styles.messageBlock}>
					<p className={styles.body}>Verifying your email...</p>
				</div>
			)}

			{status === 'success' && (
				<div className={styles.messageBlock}>
					<p className={styles.heading}>Email verified</p>
					<p className={styles.body}>
						Your account is active. You can now sign in and start writing.
					</p>
					<Link href="/login?verified=true" className={styles.actionLink}>
						Sign in
					</Link>
				</div>
			)}

			{status === 'expired' && (
				<div className={styles.messageBlock}>
					<p className={styles.heading}>Link expired</p>
					<p className={styles.body}>
						This verification link has expired. Sign up again to receive a new one.
					</p>
					<Link href="/signup" className={styles.actionLink}>
						Back to sign up
					</Link>
				</div>
			)}

			{status === 'invalid' && (
				<div className={styles.messageBlock}>
					<p className={styles.heading}>Invalid link</p>
					<p className={styles.body}>
						This verification link is invalid or has already been used.
					</p>
					<Link href="/signup" className={styles.actionLink}>
						Back to sign up
					</Link>
				</div>
			)}
		</>
	);
}

export default function VerifyEmailPage() {
	return (
		<div className={styles.page}>
			<div className={styles.card}>
				<div className={styles.logoBlock}>
					<span className={styles.logo}>Nudge</span>
					<span className={styles.tagline}>a writing companion</span>
				</div>

				<Suspense>
					<VerifyEmailContent />
				</Suspense>
			</div>
		</div>
	);
}
