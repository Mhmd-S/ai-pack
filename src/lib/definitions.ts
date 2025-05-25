import { z } from 'zod';

export const SignupFormSchema = z.object({
	email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
	password: z
		.string()
		.min(8, { message: 'Be at least 8 characters long' })
		.regex(/[a-zA-Z]/, { message: 'Contain at least one letter.' })
		.regex(/[0-9]/, { message: 'Contain at least one number.' })
		.regex(/[^a-zA-Z0-9]/, {
			message: 'Contain at least one special character.',
		})
		.trim(),
});

export const ProjectFormSchema = z.object({
	model: z.object({
		modelType: z.string(),
		modelPath: z.string(),
		scale: z.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
		}),
		faces: z.array(
			z.object({
				faceName: z.string(),
				isSolidColor: z.boolean(),
				solidColorValue: z.string().optional(),
				designElements: z.array(
					z.object({
						type: z.enum(['text', 'image', 'shape']),
						content: z.object({
							text: z.string().optional(),
							imageUrl: z.string().optional(),
							shapeType: z
								.enum(['rectangle', 'circle', 'triangle'])
								.optional(),
						}),
						position: z.object({
							x: z.number(),
							y: z.number(),
							z: z.number(),
						}),
						scale: z.object({
							x: z.number(),
							y: z.number(),
							z: z.number(),
						}),
						style: z.object({
							color: z.string().optional(),
							backgroundColor: z.string().optional(),
							opacity: z.number().optional(),
							fontFamily: z.string().optional(),
							fontSize: z.number().optional(),
							fontWeight: z.string().optional(),
							borderColor: z.string().optional(),
							borderWidth: z.number().optional(),
							borderRadius: z.number().optional(),
						}),
						faceName: z.string(),
					})
				),
			})
		),
	}),
});

export type FormState =
	| {
			errors?: {
				email?: string[];
				password?: string[];
			};
			message?: string;
	  }
	| undefined;

export type ProjectFormState = {
	errors?: {
		name?: string[];
		logoFile?: string[];
		primaryColor?: string[];
		secondaryColor?: string[];
		packagingType?: string[];
		tagLine?: string[];
		styleCue?: string[];
	};
	message?: string;
};

export type SessionPayload = {
	userId: string;
	expiresAt: Date;
};

export type User = {
	_id: string;
	username: string;
	password: string;
};


export const PACKAGING_TYPES = [
	{ value: 'clamshell', label: 'Clamshell Box' },
	{ value: 'pizza_box', label: 'Pizza Box' },
	{ value: 'fry_carton', label: 'Fry Carton' },
];

// Add cloud storage types
export type CloudStorageConfig = {
	provider: 'aws' | 'gcp' | 'azure';
	bucket: string;
	region: string;
	basePath: string;
};

export type ModelStorage = {
	baseModelPath: string; // Path to the original OBJ file
	editedModelPath?: string; // Path to the edited OBJ file
	version: number;
	lastEdited: Date;
	metadata: {
		originalFileName: string;
		fileSize: number;
		mimeType: string;
		checksum: string;
	};
};
