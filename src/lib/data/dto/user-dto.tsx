'use server';

import { connectDB } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/data/dal/user-dal';
import User, { UserDocument } from '@/lib/models/User';

const canSeeId = (viewer: UserDocument, user: UserDocument) => {
	if (viewer._id === user._id) return true;
};

const canSeeEmail = (viewer: UserDocument, user: UserDocument) => {
	if (viewer._id === user._id) return true;
};

export const getUserDto = async (slug: string) => {
	await connectDB();
	// Don't pass values, read back cached values, also solves context and easier to make it lazy
	const data = await User.findById(slug);

	const currentUser = await getCurrentUser();

	return {
		id: canSeeId(currentUser, data) ? data._id : null,
		email: canSeeEmail(currentUser, data) ? data.email : null,
	};
};

export const getCurrentUserDto = async () => {
	await connectDB();
	const currentUser = await getCurrentUser();

	return {
		id: currentUser._id.toString(),
		email: currentUser.email,
	};
};
