import '../globals.css';
import AppSidebar from '@/components/app-sidebar';

export const metadata = {
	title: '3lbetak',
	description: '3lbetak',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className="flex h-screen">
				<AppSidebar />
				<main className="flex-1 overflow-auto">{children}</main>
			</body>
		</html>
	);
}
