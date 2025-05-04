import { verifySession } from '@/lib/dal';
import User from '@/lib/models/User';
import { connectDB } from '@/lib/mongodb';
import { cache } from 'react';

export const getUser = cache(async () => {
	const session = await verifySession();
	if (!session) return null;

	try {
		await connectDB();
		const user = await User.findById(session?.userId);
		return user;
	} catch (error) {
		console.log('Failed to fetch user', error);
		return null;
	}
});
