'use client';

import { useState, useEffect } from 'react';

import { Plus, Folder, FolderOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getCurrentUserDto } from '@/lib/data/dto/user-dto';
import { Skeleton } from '@/components/ui/skeleton';

interface Project {
	id: string;
	name: string;
	color?: string;
	status: 'pending' | 'generating' | 'review' | 'completed' | 'error';
}

interface User {
	id: string;
	email: string;
}

const AppSidebar = () => {
	const pathname = usePathname();

	const [loading, setLoading] = useState(true);
	const [projects, setProjects] = useState<Project[]>([]);
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				// Fetch user data
				const userData = await getCurrentUserDto();
				setUser(userData);

				// Fetch projects
				const response = await fetch('/api/projects');
				const projectsData = await response.json();
				setProjects(projectsData);
			} catch (error) {
				console.error('Error fetching data:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	if (loading) {
		return (
			<div className="flex h-full w-64 flex-col border-r bg-white dark:bg-gray-950">
				{/* Header Section Skeleton */}
				<div className="flex flex-col space-y-3 p-3 border-b">
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-8 rounded-full" />
						<Skeleton className="h-4 w-24" />
					</div>
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-9 w-full" />
				</div>

				{/* Projects Section Skeleton */}
				<div className="flex-1 overflow-y-auto p-3">
					<Skeleton className="h-4 w-16 mb-2" />
					<div className="space-y-2">
						{[...Array(5)].map((_, i) => (
							<Skeleton key={i} className="h-9 w-full" />
						))}
					</div>
				</div>

				{/* Footer Section Skeleton */}
				<div className="border-t p-3">
					<div className="flex items-center gap-3">
						<Skeleton className="h-9 w-9 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-32" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full w-64 flex-col border-r bg-white dark:bg-gray-950">
			{/* Header Section */}
			<div className="flex flex-col space-y-3 p-3 border-b">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Avatar className="h-8 w-8">
							<AvatarImage
								src="/placeholder.svg?height=32&width=32"
								alt="Avatar"
							/>
							<AvatarFallback>
								{user?.email?.slice(0, 2).toUpperCase() || 'U'}
							</AvatarFallback>
						</Avatar>
						<div className="font-medium">
							{user?.email?.split('@')[0] || 'User'}
						</div>
					</div>
				</div>

				<Link href="/project">
					<Button className="w-full gap-2 hover:bg-accent/50">
						<Plus className="h-4 w-4" />
						New Project
					</Button>
				</Link>

				<div className="relative">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search projects..."
						className="pl-8 text-sm"
					/>
				</div>
			</div>

			{/* Content Section */}
			<div className="flex-1 overflow-y-auto">
				{/* Projects Section */}
				<div className="p-3">
					<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
						Projects
					</div>
					<div className="space-y-1">
						{projects.map((project) => (
							<Link
								key={project.id}
								href={`/project/${project.id}`}
								className={cn(
									'group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-200',
									pathname === `/project/${project.id}`
										? 'bg-gray-100 font-medium dark:bg-gray-800'
										: 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900'
								)}
							>
								<div
									className={cn(
										'absolute left-0 top-0 h-full w-1 rounded-r-full opacity-0 transition-all duration-200',
										project.color || 'bg-gray-500',
										pathname === `/project/${project.id}` &&
											'opacity-100'
									)}
								/>
								{pathname === `/project/${project.id}` ? (
									<FolderOpen className="h-4 w-4 text-gray-600 dark:text-gray-400" />
								) : (
									<Folder className="h-4 w-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
								)}
								<span className="truncate">{project.name}</span>
							</Link>
						))}
					</div>
				</div>
			</div>

			{/* Footer Section */}
			<div className="border-t p-3">
				<div className="flex items-center gap-3">
					<Avatar className="h-9 w-9">
						<AvatarImage
							src="/placeholder.svg?height=36&width=36"
							alt="User"
						/>
						<AvatarFallback>
							{user?.email?.slice(0, 2).toUpperCase() || 'U'}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="text-sm font-medium">
							{user?.email?.split('@')[0] || 'User'}
						</span>
						<span className="text-xs text-muted-foreground">
							{user?.email || 'No email'}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AppSidebar;
