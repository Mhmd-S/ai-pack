'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paintbrush, Maximize, Info, Type, MousePointer } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

// Define ActiveTool type directly here or import from a shared types file if available
export type ActiveTool = 'color' | 'measurements' | 'text' | 'design' | null;

interface FloatingToolbarProps {
	activeTool: ActiveTool;
	onSetTool: (tool: ActiveTool) => void;
	dropperColor: string;
	onDropperColorChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onShowInstructions: () => void;
	isFaceSelected: boolean;
	setShowTextModal: (state: boolean) => void;
	textSettings?: {
		font: string;
		size: number;
		color: string;
		onFontChange: (font: string) => void;
		onSizeChange: (size: number) => void;
		onColorChange: (color: string) => void;
	};
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
	activeTool,
	onSetTool,
	dropperColor,
	onDropperColorChange,
	onShowInstructions,
	isFaceSelected,
	textSettings,
	setShowTextModal
}) => {
	return (
		<div className="fixed top-16 left-1/4 z-30 p-2 bg-slate-700/80 backdrop-blur-sm rounded-md shadow-xl flex flex-col space-y-3">
			{/* Select Mode Tool */}
			<Button
				variant={activeTool === null ? 'secondary' : 'ghost'}
				size="icon"
				onClick={() => onSetTool(null)}
				className={`hover:bg-slate-600/50 ${
					activeTool === null
						? 'bg-slate-600 text-white'
						: 'text-slate-300'
				}`}
				title="Select Mode"
			>
				<MousePointer className="h-5 w-5" />
			</Button>

			{/* Color Dropper Tool */}
			<Button
				variant={activeTool === 'color' ? 'secondary' : 'ghost'}
				size="icon"
				onClick={() => onSetTool('color')}
				className={`hover:bg-violet-600/50 ${
					activeTool === 'color'
						? 'bg-violet-600 text-white'
						: 'text-slate-300'
				}`}
				title="Color Dropper"
			>
				<Paintbrush className="h-5 w-5" />
			</Button>
			{activeTool === 'color' && (
				<div className="p-2 bg-slate-600/50 rounded">
					<label
						htmlFor="dropper-color-picker"
						className="text-xs text-slate-300 mb-1 block"
					>
						Selected Color
					</label>
					<div className="flex items-center space-x-2">
						<Input
							id="dropper-color-picker"
							type="color"
							value={dropperColor}
							onChange={onDropperColorChange}
							className="w-16 h-9 p-0.5 bg-slate-500 border-slate-400 cursor-pointer rounded"
						/>
						<span className="text-xs text-slate-200 bg-slate-500 px-2 py-1 rounded">
							{dropperColor}
						</span>
					</div>
				</div>
			)}

			{/* Measurements Tool */}
			<Button
				variant={activeTool === 'measurements' ? 'secondary' : 'ghost'}
				size="icon"
				onClick={() => onSetTool('measurements')}
				className={`hover:bg-orange-500/50 ${
					activeTool === 'measurements'
						? 'bg-orange-600 text-white'
						: 'text-slate-300'
				}`}
				title="Measurements (Scale)"
			>
				<Maximize className="h-5 w-5" />
			</Button>

			{/* Text Tool */}
			{isFaceSelected && (
				<>
					<Button
						variant={activeTool === 'text' ? 'secondary' : 'ghost'}
						size="icon"
						onClick={() => {
							onSetTool('text');
							setShowTextModal(true);
						}}
						className={`hover:bg-blue-500/50 ${
							activeTool === 'text'
								? 'bg-blue-600 text-white'
								: 'text-slate-300'
						}`}
						title="Add Text"
					>
						<Type className="h-5 w-5" />
					</Button>
					{activeTool === 'text' && textSettings && (
						<div className="p-2 bg-slate-600/50 rounded space-y-2">
							<p className="text-xs text-slate-300 mb-1 font-medium">
								Text Settings
							</p>
							<div className="space-y-2">
								<div>
									<label className="text-xs text-slate-300 mb-1 block">
										Font
									</label>
									<Select
										value={textSettings.font}
										onValueChange={
											textSettings.onFontChange
										}
									>
										<SelectTrigger className="w-full h-8 bg-slate-500 border-slate-400 text-slate-100 text-xs">
											<SelectValue placeholder="Select font" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Arial">
												Arial
											</SelectItem>
											<SelectItem value="Helvetica">
												Helvetica
											</SelectItem>
											<SelectItem value="Times New Roman">
												Times New Roman
											</SelectItem>
											<SelectItem value="Courier New">
												Courier New
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div>
									<label className="text-xs text-slate-300 mb-1 block">
										Size
									</label>
									<Input
										type="number"
										value={textSettings.size}
										onChange={(e) =>
											textSettings.onSizeChange(
												Number(e.target.value)
											)
										}
										className="w-full h-8 p-1 bg-slate-500 border-slate-400 text-slate-100 text-xs"
										min="8"
										max="72"
									/>
								</div>
								<div>
									<label className="text-xs text-slate-300 mb-1 block">
										Color
									</label>
									<div className="flex items-center space-x-2">
										<Input
											type="color"
											value={textSettings.color}
											onChange={(e) =>
												textSettings.onColorChange(
													e.target.value
												)
											}
											className="w-16 h-8 p-0.5 bg-slate-500 border-slate-400 cursor-pointer rounded"
										/>
										<span className="text-xs text-slate-200 bg-slate-500 px-2 py-1 rounded">
											{textSettings.color}
										</span>
									</div>
								</div>
							</div>
						</div>
					)}
				</>
			)}

			{/* Divider */}
			<div className="border-t border-slate-600 my-1"></div>

			{/* Info Button for Instructions */}
			<Button
				variant={'ghost'}
				size="icon"
				onClick={onShowInstructions}
				className={'text-slate-300 hover:bg-sky-500/50'}
				title="Instructions"
			>
				<Info className="h-5 w-5" />
			</Button>
		</div>
	);
};

export default FloatingToolbar;
