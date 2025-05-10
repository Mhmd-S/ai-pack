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
	name: z.string().min(1, 'Project name is required'),
	logoFile: z.any().optional(),
	primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
	secondaryColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
	packagingType: z.enum(['clamshell', 'pizza_box', 'fry_carton']),
	tagLine: z.string().optional(),
	styleCue: z.string().optional(),
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

export const styles = ['engraving', 'linocut', 'line_art', 'line_circuit'] as const;

export const PACKAGING_TYPES = [
	{ value: 'clamshell', label: 'Clamshell Box' },
	{ value: 'pizza_box', label: 'Pizza Box' },
	{ value: 'fry_carton', label: 'Fry Carton' },
];

