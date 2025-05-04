import { getCurrentUserDto } from '@/lib/data/dto/user-dto';

const DashboardPage = async () => {
	const user = await getCurrentUserDto();

	return (
		<div>
			<h2 className="text-2xl font-bold mb-4">Dashboard</h2>
			<p>Welcome, {user?.email}!</p>
		</div>
	);
};

export default DashboardPage;
