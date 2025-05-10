import { cache } from 'react';

// Use Next.js's cache with a 24-hour revalidation
const getWebhookSecret = cache(async (): Promise<string> => {
	try {
		const apiToken = process.env.REPLICATE_API_TOKEN;
		if (!apiToken) {
			throw new Error(
				'REPLICATE_API_TOKEN is not set in environment variables'
			);
		}

		const response = await fetch(
			'https://api.replicate.com/v1/webhooks/default/secret',
			{
				headers: {
					Authorization: 'Bearer ' + apiToken,
					'Content-Type': 'application/json',
				},
				next: {
					revalidate: 24 * 60 * 60, // 24 hours in seconds
				},
			}
		);

		if (!response.ok) {
			throw new Error(
				`Failed to get webhook secret: ${response.statusText}`
			);
		}

		const data = await response.json();
		return data.key;
	} catch (error) {
		console.error('Error fetching webhook secret:', error);
		throw error;
	}
});

export { getWebhookSecret };
