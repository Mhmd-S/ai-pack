// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { Provider } from '@/proivders/authSession';
export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<Provider>
			<body className="min-h-screen flex flex-col">
				<header className="bg-background shadow p-4">
					<div className="container mx-auto flex items-center justify-between">
						<h1 className="text-xl font-bold tracking-tight">
							AI Packaging MVP
						</h1>
					</div>
				</header>
				<Separator />
				<main className="flex-1 container mx-auto p-4 flex flex-col items-center justify-center">
					{children}
				</main>
				<Separator />
				<footer className="bg-background shadow p-4 text-center text-sm text-muted-foreground">
					&copy; {new Date().getFullYear()} AI Packaging MVP
				</footer>
					<Toaster />
				</body>
			</Provider>
		</html>
	);
}
