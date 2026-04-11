import { pool } from '@/lib/server/db';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await auth();
	if (!session?.user) return new Response('Unauthorized', { status: 401 });

	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > 500_000) return new Response('Payload too large', { status: 413 });

	const { id } = await params;
	const project = await request.json();
	await pool.query(
		`INSERT INTO projects (id, user_id, data, updated_at)
		 VALUES ($1, $2, $3, now())
		 ON CONFLICT (id) DO UPDATE
		   SET data = $3, updated_at = now()
		   WHERE projects.user_id = $2`,
		[id, session.user.email, JSON.stringify(project)]
	);
	return new Response(null, { status: 204 });
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await auth();
	if (!session?.user) return new Response('Unauthorized', { status: 401 });

	const { id } = await params;
	await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [
		id,
		session.user.email
	]);
	return new Response(null, { status: 204 });
}
