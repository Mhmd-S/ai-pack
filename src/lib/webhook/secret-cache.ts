interface CachedSecret {
	secret: string;
	expiresAt: number;
}

class WebhookSecretCache {
	private static instance: WebhookSecretCache;
	private cache: CachedSecret | null = null;
	private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

	private constructor() {}

	public static getInstance(): WebhookSecretCache {
		if (!WebhookSecretCache.instance) {
			WebhookSecretCache.instance = new WebhookSecretCache();
		}
		return WebhookSecretCache.instance;
	}

	public setSecret(secret: string): void {
		this.cache = {
			secret,
			expiresAt: Date.now() + this.CACHE_DURATION,
		};
	}

	public getSecret(): string | null {
		if (!this.cache) return null;

		// Check if the secret is still valid
		if (this.cache.expiresAt > Date.now()) {
			return this.cache.secret;
		}

		// Secret has expired
		this.cache = null;
		return null;
	}

	public clearCache(): void {
		this.cache = null;
	}
}

export const webhookSecretCache = WebhookSecretCache.getInstance();
