import Replicate from 'replicate';
import { getWebhookSecret } from '@/lib/webhook/webhook-secret';

// Types for the API responses
export interface PredictionResponse {
	id: string;
	version: string;
	urls: {
		get: string;
		cancel: string;
	};
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
	status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
	input: Record<string, unknown>;
	output: string[] | null; // For Recraft, output is an array of image URLs
	error: string | null;
	logs: string | null;
	metrics: {
		predict_time: number;
	};
}

export interface RecraftInput {
	prompt: string;
	negative_prompt: string;
}

export class ReplicateAPI {
	private replicate: Replicate;
	private readonly RECRAFT_MODEL = 'ideogram-ai/ideogram-v2';

	constructor(apiToken: string) {
		this.replicate = new Replicate({
			auth: apiToken,
		});
	}

	/**
	 * Get the webhook secret for verifying webhooks
	 * @returns Promise<string> The webhook secret
	 */
	async getWebhookSecret(): Promise<string> {
		return getWebhookSecret();
	}

	/**
	 * Start a new Recraft SVG generation
	 * @param input The input parameters for the Recraft model
	 * @param webhookUrl Webhook URL to receive the prediction results
	 * @returns Promise<PredictionResponse>
	 */
	async generateSVG(
		input: RecraftInput,
		webhookUrl: string
	): Promise<PredictionResponse> {
		try {
			const prediction = await this.replicate.predictions.create({
				version: this.RECRAFT_MODEL,
				input,
				webhook: webhookUrl,
			});
			return prediction as PredictionResponse;
		} catch (error) {
			console.error('Error creating SVG prediction:', error);
			throw new Error('Failed to create SVG prediction');
		}
	}

	/**
	 * Get the status of a prediction
	 * @param predictionId The ID of the prediction to check
	 * @returns Promise<PredictionResponse>
	 */
	async getPrediction(predictionId: string): Promise<PredictionResponse> {
		try {
			const prediction = await this.replicate.predictions.get(
				predictionId
			);
			return prediction as PredictionResponse;
		} catch (error) {
			console.error('Error getting prediction:', error);
			throw new Error('Failed to get prediction status');
		}
	}

	/**
	 * Cancel a running prediction
	 * @param predictionId The ID of the prediction to cancel
	 * @returns Promise<void>
	 */
	async cancelPrediction(predictionId: string): Promise<void> {
		try {
			await this.replicate.predictions.cancel(predictionId);
		} catch (error) {
			console.error('Error canceling prediction:', error);
			throw new Error('Failed to cancel prediction');
		}
	}

	/**
	 * List all predictions
	 * @returns Promise<PredictionResponse[]>
	 */
	async listPredictions(): Promise<PredictionResponse[]> {
		try {
			const predictions = await this.replicate.predictions.list();
			return predictions as PredictionResponse[];
		} catch (error) {
			console.error('Error listing predictions:', error);
			throw new Error('Failed to list predictions');
		}
	}
}
