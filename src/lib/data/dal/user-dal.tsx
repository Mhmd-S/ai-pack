'use server';

import { connectDB } from '@/lib/mongodb';
import { verifySession } from '@/lib/data/auth';
import User from '@/lib/models/User';

export const getCurrentUser = async () => {
	await connectDB();
	const session = await verifySession();
	if (!session) return null;

	try {
		const data = await User.findById(session.userId);
		return data;
	} catch (error) {
		console.log(error);
		return null;
	}
};
