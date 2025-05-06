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
	name: z.string().min(1, { message: 'Project name is required' }).trim(),
	primaryColor: z.string().min(1, { message: 'Primary color is required' }),
	secondaryColor: z.string().default('#ffffff'),
	foodType: z.enum(['burger', 'fries', 'pizza'], {
		errorMap: () => ({ message: 'Please select a valid food type' }),
	}),
	packagingType: z.enum(['clamshell', 'pizza_box', 'fry_carton'], {
		errorMap: () => ({ message: 'Please select a valid packaging type' }),
	}),
	// We can't fully validate the file with Zod, but we'll check if it's provided
	logoFile: z.any().refine((val) => val instanceof File && val.size > 0, {
		message: 'Please upload a logo image',
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

export type ProjectFormState =
	| {
			errors?: {
				name?: string[];
				primaryColor?: string[];
				secondaryColor?: string[];
				foodType?: string[];
				packagingType?: string[];
				logoFile?: string[];
			};
			message?: string;
	  }
	| undefined;

export type SessionPayload = {
	userId: string;
	expiresAt: Date;
};

export type User = {
	_id: string;
	username: string;
	password: string;
};
