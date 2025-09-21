"use client";

import { ReactNode } from "react";

export default function Modal({
	isOpen,
	onClose,
	children,
}: {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
}) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
			<div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
				<button
					onClick={onClose}
					className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
					aria-label="Close modal">
					✕
				</button>
				{children}
			</div>
		</div>
	);
}
