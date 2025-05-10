import crypto from 'crypto';
import { getWebhookSecret } from './webhook-secret';

export async function verifyReplicateWebhook(
	request: Request
): Promise<{ isValid: boolean; body: any }> {
	try {
		// Get webhook headers
		const webhookId = request.headers.get('webhook-id');
		const webhookTimestamp = request.headers.get('webhook-timestamp');
		const webhookSignatures = request.headers.get('webhook-signature');

		// Validate required headers
		if (!webhookId || !webhookTimestamp || !webhookSignatures) {
			console.error('Missing required headers');
			return { isValid: false, body: null };
		}

		// Validate timestamp (5 minute tolerance)
		const MAX_DIFF_IN_SECONDS = 5 * 60;
		const timestamp = parseInt(webhookTimestamp);
		const now = Math.floor(Date.now() / 1000);
		const diff = Math.abs(now - timestamp);

		if (diff > MAX_DIFF_IN_SECONDS) {
			console.error(`Webhook timestamp is too old: ${diff} seconds`);
			return { isValid: false, body: null };
		}

		// Get raw request body as string
		const rawBody = await request.text();
		const body = JSON.parse(rawBody);

		// Construct the signed content
		const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;

		// Get the webhook secret
		const webhookSecret = await getWebhookSecret();

		// Get the secret key (remove 'whsec_' prefix)
		const secretKey = webhookSecret.split('_')[1];
		const secretBytes = Buffer.from(secretKey, 'base64');

		// Calculate the HMAC signature
		const computedSignature = crypto
			.createHmac('sha256', secretBytes)
			.update(signedContent)
			.digest('base64');

		// Parse the webhook signatures
		const expectedSignatures = webhookSignatures
			.split(' ')
			.map((sig) => sig.split(',')[1]);

		// Use constant-time comparison to prevent timing attacks
		const isValid = expectedSignatures.some((expectedSig) =>
			crypto.timingSafeEqual(
				Buffer.from(expectedSig),
				Buffer.from(computedSignature)
			)
		);

		if (!isValid) {
			console.error('Invalid webhook signature');
			return { isValid: false, body: null };
		}

		return { isValid: true, body };
	} catch (error) {
		console.error('Error verifying webhook:', error);
		return { isValid: false, body: null };
	}
}
