import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface TextInputModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (text: string, fontSize: number, fontFamily: string) => void;
	initialText?: string;
	initialFontSize?: number;
	initialFontFamily?: string;
}

const TextInputModal = ({
	isOpen,
	onClose,
	onSubmit,
	initialText = '',
	initialFontSize = 24,
	initialFontFamily = 'Arial',
}: TextInputModalProps) => {
	const [text, setText] = useState(initialText);
	const [fontSize, setFontSize] = useState(initialFontSize);
	const [fontFamily, setFontFamily] = useState(initialFontFamily);
	const [error, setError] = useState('');

	const handleSubmit = () => {
		if (!text.trim()) {
			setError('Please enter some text');
			return;
		}
		onSubmit(text, fontSize, fontFamily);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Text to Face</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="text">Text Content</Label>
						<Input
							id="text"
							value={text}
							onChange={(e) => {
								setText(e.target.value);
								setError('');
							}}
							placeholder="Enter your text here"
						/>
						{error && (
							<p className="text-sm text-red-500">{error}</p>
						)}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="fontSize">Font Size</Label>
						<Input
							id="fontSize"
							type="number"
							value={fontSize}
							onChange={(e) =>
								setFontSize(Number(e.target.value))
							}
							min={8}
							max={72}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="fontFamily">Font Family</Label>
						<Select
							value={fontFamily}
							onValueChange={setFontFamily}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select font" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Arial">Arial</SelectItem>
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
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSubmit}>Add Text</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TextInputModal;
