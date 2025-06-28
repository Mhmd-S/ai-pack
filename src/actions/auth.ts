'use server';

import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

import { FormState, SignupFormSchema } from '@/lib/definitions';
import { createSession, deleteSession } from '@/lib/sessions';
import { redirect } from 'next/navigation';

export const register = async (state: FormState, formData: FormData) => {
	// Validate the form data
	const validatedFields = SignupFormSchema.safeParse({
		email: formData.get('email'),
		password: formData.get('password'),
	});

	if (!validatedFields.success) {
		return {
			errors: validatedFields.error.flatten().fieldErrors,
		};
	}

	try {
		await connectDB();

		// Check if the user already exists
		const userFound = await User.findOne({ email: formData.get('email') });
		if (userFound) {
			return {
				error: 'Email already exists!',
			};
		}

		// Parse the form data
		const { email, password } = validatedFields.data;

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create a new user
		const user = new User({
			email,
			password: hashedPassword,
		});

		// Save the user to the database
		const savedUser = await user.save();
		// Create a session for the user
		await createSession(savedUser._id);
	} catch (e) {
		console.log(e);
	}

	// Redirect to the project page
	redirect('/project');
};

export const login = async (state: FormState, formData: FormData) => {
	// Validate the form data
	const validatedFields = SignupFormSchema.safeParse({
		email: formData.get('email'),
		password: formData.get('password'),
	});

	if (!validatedFields.success) {
		return {
			errors: validatedFields.error.flatten().fieldErrors,
		};
	}

	try {
		await connectDB();

		// Check if the user already exists
		const user = await User.findOne({ email: formData.get('email') });

		if (!user) {
			return {
				error: 'Invalid Credentials!',
			};
		}

		// Parse the form data
		const { password } = validatedFields.data;

		// Hash the password
		const result = await bcrypt.compare(password, user.password);

		if (!result) {
			return {
				error: 'Invalid password!',
			};
		}

		// Create a session for the user
		await createSession(user._id);
	} catch (e) {
		console.log(e);
	}
	// Redirect to the project page
	redirect('/project');
};

export const logout = async () => {
	await deleteSession();
	redirect('/login');
};
