'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PACKAGING_TYPES } from '@/lib/definitions';

interface FormErrors {
	[key: string]: string[];
}

export default function Page() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<FormErrors | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [logoPreview, setLogoPreview] = useState<string | null>(null);

	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				setLogoPreview(event.target?.result as string);
			};
			reader.readAsDataURL(file);
		} else {
			setLogoPreview(null);
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setErrors(null);
		setMessage(null);

		const formData = new FormData(e.currentTarget);

		try {
			const response = await fetch('/api/projects', {
				method: 'POST',
				body: formData,
			});

			const data = await response.json();

			if (!response.ok) {
				if (response.status === 400) {
					setErrors(data.errors);
				} else {
					setMessage(data.message || 'Failed to create project');
				}
				return;
			}

			router.push(`/project/${data.projectId}`);
		} catch (error) {
			setMessage('Failed to create project. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-lg mx-auto">
			<CardHeader>
				<CardTitle>Create New Packaging Project</CardTitle>
				<CardDescription>
					Create a custom branded packaging for your food products
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-6" onSubmit={handleSubmit}>
					{message && (
						<Alert variant="destructive">
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-2">
						<Label htmlFor="name">Project Name</Label>
						<Input
							id="name"
							name="name"
							placeholder="My Burger Package"
							disabled={loading}
							defaultValue="Test Burger Package"
						/>
						{errors?.name && (
							<p className="text-red-500 text-sm">
								{errors.name[0]}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="logo">Brand Logo</Label>
						<div className="flex space-x-4 items-center">
							<Input
								id="logo"
								name="logo"
								type="file"
								accept="image/*"
								onChange={handleLogoChange}
								disabled={loading}
								className="flex-1"
							/>
							{logoPreview && (
								<div className="h-12 w-12 rounded-md overflow-hidden border border-gray-200">
									<img
										src={logoPreview}
										alt="Logo preview"
										className="h-full w-full object-contain"
									/>
								</div>
							)}
						</div>
						{errors?.logoFile && (
							<p className="text-red-500 text-sm">
								{errors.logoFile[0]}
							</p>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="primaryColor">Primary Color</Label>
							<div className="flex items-center space-x-2">
								<Input
									id="primaryColor"
									name="primaryColor"
									type="color"
									defaultValue="#ff0000"
									className="w-12 h-10 p-1 border rounded-md"
									disabled={loading}
								/>
								<span className="text-sm text-gray-500">
									Brand primary color
								</span>
							</div>
							{errors?.primaryColor && (
								<p className="text-red-500 text-sm">
									{errors.primaryColor[0]}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="secondaryColor">
								Secondary Color
							</Label>
							<div className="flex items-center space-x-2">
								<Input
									id="secondaryColor"
									name="secondaryColor"
									type="color"
									defaultValue="#ffffff"
									className="w-12 h-10 p-1 border rounded-md"
									disabled={loading}
								/>
								<span className="text-sm text-gray-500">
									Optional
								</span>
							</div>
							{errors?.secondaryColor && (
								<p className="text-red-500 text-sm">
									{errors.secondaryColor[0]}
								</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label>Packaging Template</Label>
						<Select
							name="packagingType"
							defaultValue="clamshell"
							disabled={loading}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select packaging template" />
							</SelectTrigger>
							<SelectContent>
								{PACKAGING_TYPES.map((pt) => (
									<SelectItem key={pt.value} value={pt.value}>
										{pt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors?.packagingType && (
							<p className="text-red-500 text-sm">
								{errors.packagingType[0]}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="tagLine">Tag Line</Label>
						<Input
							id="tagLine"
							name="tagLine"
							placeholder="Enter your brand tag line"
							disabled={loading}
							defaultValue="The Best Burgers in Town"
						/>
						{errors?.tagLine && (
							<p className="text-red-500 text-sm">
								{errors.tagLine[0]}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="styleCue">Style Cue</Label>
						<Input
							id="styleCue"
							name="styleCue"
							placeholder="Enter style preferences or cues"
							disabled={loading}
							defaultValue="Modern, minimalist design with bold typography"
						/>
						{errors?.styleCue && (
							<p className="text-red-500 text-sm">
								{errors.styleCue[0]}
							</p>
						)}
					</div>

					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? 'Creating Project...' : 'Create Project'}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
