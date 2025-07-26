import '../globals.css';
import AppSidebar from '@/components/app-sidebar';

export const metadata = {
	title: 'The Box',
	description: 'The box',
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
