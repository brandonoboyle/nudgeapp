import { pool } from '@/lib/server/db';
import { auth } from '@/lib/auth';

export async function GET() {
	const session = await auth();
	if (!session?.user) return new Response('Unauthorized', { status: 401 });

	const result = await pool.query('SELECT data FROM user_settings WHERE user_id = $1', [
		session.user.email
	]);
	return Response.json(result.rows[0]?.data ?? {});
}

export async function PUT(request: Request) {
	const session = await auth();
	if (!session?.user) return new Response('Unauthorized', { status: 401 });

	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > 50_000) return new Response('Payload too large', { status: 413 });

	const settings = await request.json();
	await pool.query(
		`INSERT INTO user_settings (user_id, data, updated_at)
		 VALUES ($1, $2, now())
		 ON CONFLICT (user_id) DO UPDATE
		   SET data = $2, updated_at = now()`,
		[session.user.email, JSON.stringify(settings)]
	);
	return new Response(null, { status: 204 });
}
