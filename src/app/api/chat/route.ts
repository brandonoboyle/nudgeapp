import Anthropic from '@anthropic-ai/sdk';
import type { AIMessage, Project } from '@/lib/types';
import { buildGlobalContext } from '@/lib/services/contextBuilder';
import { buildSystemPrompt } from '@/lib/services/aiService';
import { pool } from '@/lib/server/db';
import { auth } from '@/lib/auth';

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory per-serverless-instance. Resets on cold start — sufficient for
// a small personal deployment. Upgrade to DB-backed counting for public launch.
const RATE_LIMIT = 50; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(key);

	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return false;
	}

	if (entry.count >= RATE_LIMIT) return true;
	entry.count++;
	return false;
}

// ── Model selection ───────────────────────────────────────────────────────────
const MODEL = 'claude-haiku-4-5-20251001';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Keep the last N messages to prevent runaway token costs on long sessions.
const MAX_HISTORY = 20;

export async function POST(request: Request) {
	const session = await auth();

	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	const rateLimitKey = session.user?.email ?? request.headers.get('x-forwarded-for') ?? 'anonymous';

	if (isRateLimited(rateLimitKey)) {
		return new Response('Too many requests. Please wait a moment before trying again.', {
			status: 429
		});
	}

	const { messages, projectId } = (await request.json()) as {
		messages: AIMessage[];
		projectId: string;
	};

	// Validate inputs
	if (typeof projectId !== 'string' || !projectId.trim()) {
		return new Response('Bad request', { status: 400 });
	}
	if (
		!Array.isArray(messages) ||
		messages.some((m) => typeof m.content === 'string' && m.content.length > 8_000)
	) {
		return new Response('Bad request', { status: 400 });
	}

	// Fetch project from DB — scoped to the authenticated user to prevent cross-user access.
	const result = await pool.query<{ data: Project }>(
		'SELECT data FROM projects WHERE id = $1 AND user_id = $2',
		[projectId, session.user?.email]
	);
	if (!result.rows.length) {
		return new Response('Project not found', { status: 404 });
	}
	const project = result.rows[0].data;

	const context = buildGlobalContext(
		project.collaborativeFolders,
		project.projectCore,
		project.excludedFolderIds
	);
	const systemPrompt = buildSystemPrompt(context);

	// Truncate history and ensure it starts with a user message
	const recent = messages.slice(-MAX_HISTORY);
	const firstUser = recent.findIndex((m) => m.role === 'user');
	const history = firstUser > 0 ? recent.slice(firstUser) : recent;

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			try {
				const response = client.messages.stream({
					model: MODEL,
					max_tokens: 512,
					temperature: 0.85,
					system: [
						{
							type: 'text',
							text: systemPrompt,
							cache_control: { type: 'ephemeral' }
						}
					],
					messages: history
						.filter((m): m is typeof m & { role: 'user' | 'assistant' } =>
							m.role === 'user' || m.role === 'assistant'
						)
						.map((m) => ({ role: m.role, content: m.content }))
				});

				for await (const chunk of response) {
					if (
						chunk.type === 'content_block_delta' &&
						chunk.delta.type === 'text_delta'
					) {
						controller.enqueue(encoder.encode(chunk.delta.text));
					}
				}
			} catch (err) {
				console.error('[chat] Anthropic error:', err);
				controller.enqueue(encoder.encode('\n\n[Something went wrong. Please try again.]'));
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
}
