'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

// This would typically come from your database or API
const AVAILABLE_MODELS = [
	{
		id: 'clamshell',
		name: 'Clamshell Box',
		type: 'clamshell',
		thumbnail: '/thumbnails/clamshell.png',
		category: 'boxes',
		tags: ['standard', 'simple', 'versatile'],
	},
	{
		id: 'basket',
		name: 'Basket',
		type: 'basket',
		thumbnail: '/thumbnails/basket.png',
		category: 'boxes',
		tags: ['standard', 'simple', 'versatile'],
	},
	{
		id: 'transparent',
		name: 'Transparent Box',
		type: 'transparent',
		thumbnail: '/thumbnails/transparent.png',
		category: 'boxes',
		tags: ['standard', 'simple', 'versatile'],
	},
	{
		id: 'cakebox',
		name: 'Cake Box',
		type: 'cakebox',
		thumbnail: '/thumbnails/cakebox.png',
		category: 'boxes',
		tags: ['standard', 'simple', 'versatile'],
	},
	{
		id: 'fries',
		name: 'Fries Box',
		type: 'fries',
		thumbnail: '/thumbnails/fries.png',
		category: 'boxes',
		tags: ['standard', 'simple', 'versatile'],
	},
];

export default function SelectModelPage() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [selectedModel, setSelectedModel] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');

	const filteredModels = useMemo(() => {
		if (!searchQuery) return AVAILABLE_MODELS;

		const query = searchQuery.toLowerCase();
		return AVAILABLE_MODELS.filter(
			(model) =>
				model.name.toLowerCase().includes(query) ||
				model.category.toLowerCase().includes(query) ||
				model.tags.some((tag) => tag.toLowerCase().includes(query))
		);
	}, [searchQuery]);

	const handleModelSelect = async () => {
		try {
			setIsLoading(true);

			if (!selectedModel) {
				toast.error('Please select a model');
				setIsLoading(false);
				return;
			}

			const model = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
			if (!model) {
				toast.error('Selected model not found');
				setIsLoading(false);
				return;
			}

			// Navigate to the project editor page with modelType as a query parameter
			router.push(`/project/new?modelType=${model.type}`);
		} catch (error) {
			console.error('Error navigating to project editor:', error);
			toast.error('Failed to proceed to project editor');
			setIsLoading(false);
		}
	};

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-3xl font-bold mb-8">
					Choose a Packaging Model
				</h1>

				{/* Search Bar */}
				<div className="relative mb-8">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
					<Input
						placeholder="Search models by name, category, or tags..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>

				{/* Model Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredModels.map((model) => (
						<Card
							key={model.id}
							className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
								selectedModel === model.id
									? 'ring-2 ring-primary'
									: ''
							}`}
							onClick={() => setSelectedModel(model.id)}
						>
							<div className="aspect-square bg-muted rounded-lg relative overflow-hidden">
								{/* Add model preview here */}
								<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
									Preview
								</div>
							</div>
							<div className="space-y-2">
								<h3 className="font-semibold">{model.name}</h3>
								<div className="flex flex-wrap gap-2">
									<span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
										{model.category}
									</span>
									{model.tags.map((tag) => (
										<span
											key={tag}
											className="text-xs px-2 py-1 bg-muted rounded-full"
										>
											{tag}
										</span>
									))}
								</div>
							</div>
						</Card>
					))}
				</div>

				{filteredModels.length === 0 && (
					<div className="text-center py-12">
						<p className="text-muted-foreground">
							No models found matching your search.
						</p>
					</div>
				)}

				<div className="mt-8 flex justify-end">
					<Button
						onClick={handleModelSelect}
						disabled={isLoading || !selectedModel}
						size="lg"
					>
						{isLoading ? 'Creating Project...' : 'Create Project'}
					</Button>
				</div>
			</div>
		</div>
	);
}
