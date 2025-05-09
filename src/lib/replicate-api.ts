import Replicate from 'replicate';

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
	output: unknown;
	error: string | null;
	logs: string | null;
	metrics: {
		predict_time: number;
	};
}

export class ReplicateAPI {
	private replicate: Replicate;

	constructor(apiToken: string) {
		this.replicate = new Replicate({
			auth: apiToken,
		});
	}

	/**
	 * Start a new prediction
	 * @param modelVersion The model version to use (e.g., "stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478")
	 * @param input The input parameters for the model
	 * @returns Promise<PredictionResponse>
	 */
	async createPrediction(
		modelVersion: string,
		input: Record<string, unknown>
	): Promise<PredictionResponse> {
		try {
			const prediction = await this.replicate.predictions.create({
				version: modelVersion,
				input,
			});
			return prediction as PredictionResponse;
		} catch (error) {
			console.error('Error creating prediction:', error);
			throw new Error('Failed to create prediction');
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
