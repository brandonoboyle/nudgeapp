import { pool } from '@/lib/server/db';
import { auth } from '@/lib/auth';

export async function GET() {
	const session = await auth();
	if (!session?.user) return new Response('Unauthorized', { status: 401 });

	const result = await pool.query(
		'SELECT data FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
		[session.user.email]
	);
	const projects = result.rows.map((r) => r.data);
	return Response.json(projects);
}
