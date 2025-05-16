import React from 'react';

export const ProjectSkeleton: React.FC = () => {
	return (
		<div className="w-full max-w-4xl mx-auto">
			<div className="p-6 space-y-6">
				{/* Header Skeleton */}
				<div className="space-y-2">
					<div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
					<div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
				</div>

				{/* Progress Bar Skeleton */}
				<div className="space-y-4">
					<div className="h-2 w-full bg-gray-200 rounded animate-pulse"></div>
					<div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
				</div>

				{/* Design Variations Grid Skeleton */}
				<div className="grid grid-cols-2 gap-4">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="space-y-4">
							<div className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
							<div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
