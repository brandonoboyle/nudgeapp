import { initializePaddle, type Paddle, type CheckoutOpenOptions } from '@paddle/paddle-js';

let paddle: Paddle | undefined;

export async function getPaddle(): Promise<Paddle> {
	if (paddle) return paddle;

	const initialized = await initializePaddle({
		environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
		token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
		checkout: {
			settings: {
				displayMode: 'overlay',
				theme: 'light',
				locale: 'en'
			}
		}
	});

	if (!initialized) throw new Error('Failed to initialize Paddle');
	paddle = initialized;
	return paddle;
}

export async function openCheckout(options: CheckoutOpenOptions, email?: string | null): Promise<void> {
	const p = await getPaddle();
	if (email) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(options as any).customer = { email };
	}
	p.Checkout.open(options);
}
