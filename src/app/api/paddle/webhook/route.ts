import { pool } from '@/lib/server/db';

async function verifySignature(rawBody: string, signatureHeader: string): Promise<boolean> {
	const parts = Object.fromEntries(signatureHeader.split(';').map((p) => p.split('=')));
	const ts = parts['ts'];
	const h1 = parts['h1'];
	if (!ts || !h1) return false;

	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(process.env.PADDLE_WEBHOOK_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signedPayload = encoder.encode(`${ts}:${rawBody}`);
	const signature = await crypto.subtle.sign('HMAC', key, signedPayload);
	const computed = Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return computed === h1;
}

export async function POST(request: Request) {
	const signatureHeader = request.headers.get('paddle-signature');
	if (!signatureHeader) {
		return new Response('Missing signature', { status: 401 });
	}

	const rawBody = await request.text();

	const valid = await verifySignature(rawBody, signatureHeader);
	if (!valid) {
		return new Response('Invalid signature', { status: 401 });
	}

	let event: { event_type: string; data: Record<string, unknown> };
	try {
		event = JSON.parse(rawBody);
	} catch {
		return new Response('Invalid JSON', { status: 400 });
	}

	const data = event.data as Record<string, unknown>;
	const customerEmail =
		(data.customer as Record<string, unknown> | undefined)?.email as string | undefined;

	switch (event.event_type) {
		case 'subscription.activated':
		case 'subscription.updated': {
			if (!customerEmail) break;
			const status = (data.status as string) === 'past_due' ? 'past_due' : 'active';
			const periodEnd = (data.current_billing_period as Record<string, unknown> | undefined)
				?.ends_at as string | undefined;
			await pool.query(
				`UPDATE users
				 SET subscription_status = $1,
				     subscription_id = $2,
				     subscription_current_period_end = $3
				 WHERE email = $4`,
				[status, data.id as string, periodEnd ?? null, customerEmail]
			);
			break;
		}

		case 'subscription.canceled': {
			if (!customerEmail) break;
			const periodEnd = (data.current_billing_period as Record<string, unknown> | undefined)
				?.ends_at as string | undefined;
			await pool.query(
				`UPDATE users
				 SET subscription_status = 'canceled',
				     subscription_current_period_end = $1
				 WHERE email = $2`,
				[periodEnd ?? null, customerEmail]
			);
			break;
		}
	}

	return new Response(null, { status: 200 });
}
