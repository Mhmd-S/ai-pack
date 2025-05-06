'use client';

import { Plus, Folder, FolderOpen, Home, Settings, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Project {
	id: string;
	name: string;
	color?: string;
}

const projects: Project[] = [
	{ id: '1', name: 'Marketing Website', color: 'bg-rose-500' },
	{ id: '2', name: 'Mobile App', color: 'bg-blue-500' },
	{ id: '3', name: 'Dashboard UI', color: 'bg-amber-500' },
	{ id: '4', name: 'E-commerce Platform', color: 'bg-emerald-500' },
	{ id: '5', name: 'Analytics Tool', color: 'bg-violet-500' },
];

const AppSidebar = () => {
	const pathname = usePathname();

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
							<AvatarFallback>AC</AvatarFallback>
						</Avatar>
						<div className="font-medium">Acme Inc</div>
					</div>
				</div>

				<Button className="w-full gap-2 hover:bg-accent/50">
					<Plus className="h-4 w-4" />
					<span>New Project</span>
				</Button>

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
						<AvatarFallback>JD</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="text-sm font-medium">John Doe</span>
						<span className="text-xs text-muted-foreground">
							john@example.com
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AppSidebar;
