'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogClose,
	DialogFooter,
} from '@/components/ui/dialog';
import { Info } from 'lucide-react';

interface InstructionsModalProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({
	isOpen,
	onOpenChange,
}) => {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-slate-200">
				<DialogHeader>
					<DialogTitle className="text-violet-400 flex items-center">
						<Info className="mr-2 h-5 w-5" /> Instructions
					</DialogTitle>
				</DialogHeader>
				<div className="p-4 text-sm text-slate-300 space-y-2">
					<ul className="list-disc list-inside space-y-1">
						<li>
							Use the floating toolbar on the left to select
							tools.
						</li>
						<li>
							Color Dropper: Pick a color, then click a face on
							the 3D model to apply.
						</li>
						<li>
							Measurements: Adjust X, Y, Z to scale the model.
						</li>
						<li>
							Changes are temporary until &apos;Save All
							Changes&apos; is clicked.
						</li>
					</ul>
				</div>
				<DialogFooter className="sm:justify-start pt-2">
					<DialogClose asChild>
						<Button
							type="button"
							className="bg-slate-600 hover:bg-slate-500 text-slate-100"
						>
							Close
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default InstructionsModal;
