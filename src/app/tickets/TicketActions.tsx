"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import Modal from "@/components/Modal";
import { Ticket } from "@/generated/prisma";
import { updateTicket } from "@/actions/tickets.actions";
import { toast } from "sonner";

export default function TicketActions({ ticket }: { ticket: Ticket }) {
	const [isEditOpen, setEditOpen] = useState(false);
	const [isDeleteOpen, setDeleteOpen] = useState(false);

	return (
		<div className="flex items-center justify-end gap-3 mb-2">
			<button
				className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800 transition cursor-pointer"
				title="Edit Ticket"
				onClick={() => setEditOpen(true)}>
				<FaEdit className="w-5 h-5" />
			</button>

			<button
				className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition cursor-pointer"
				title="Delete Ticket"
				onClick={() => setDeleteOpen(true)}>
				<FaTrash className="w-5 h-5" />
			</button>

			<Modal isOpen={isEditOpen} onClose={() => setEditOpen(false)}>
				<h2 className="text-xl font-semibold mb-4">Edit Ticket</h2>
				<EditFormInner ticket={ticket} onClose={() => setEditOpen(false)} />
			</Modal>

			<Modal isOpen={isDeleteOpen} onClose={() => setDeleteOpen(false)}>
				<h2 className="text-xl font-semibold mb-4">Delete Ticket</h2>
				<p className="mb-4">Are you sure you want to delete this ticket?</p>
				<DeleteFormInner
					ticketId={ticket.id}
					onClose={() => setDeleteOpen(false)}
				/>
			</Modal>
		</div>
	);
}

function EditFormInner({
	ticket,
	onClose,
}: {
	ticket: Ticket;
	onClose: () => void;
}) {
	const router = useRouter();
	const initialState = { success: false, message: "" };
	const [state, formAction] = useActionState(updateTicket, initialState);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (state.success) {
			toast.success(state.message || "Ticket updated");
			onClose();
			router.refresh();
		} else if (state.message && !state.success) {
			toast.error(state.message);
		}
		if (state.message) setSubmitting(false);
	}, [state, onClose, router]);

	return (
		<form
			action={formAction}
			className="space-y-4"
			onSubmit={() => setSubmitting(true)}>
			<input type="hidden" name="ticketId" value={String(ticket.id)} />
			<input
				type="text"
				name="subject"
				defaultValue={ticket.subject}
				className="w-full border rounded px-3 py-2"
				required
				autoFocus
			/>
			<textarea
				name="description"
				defaultValue={ticket.description ?? ""}
				className="w-full border rounded px-3 py-2"
			/>
			<select
				name="priority"
				defaultValue={ticket.priority ?? "Low"}
				className="w-full border rounded px-3 py-2">
				<option value="Low">Low</option>
				<option value="Medium">Medium</option>
				<option value="High">High</option>
			</select>

			<button
				type="submit"
				className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
				disabled={submitting}>
				{submitting ? "Saving…" : "Save Changes"}
			</button>
		</form>
	);
}

function DeleteFormInner({
	ticketId,
	onClose,
}: {
	ticketId: number;
	onClose: () => void;
}) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleDelete = async (e: React.FormEvent) => {
		e.preventDefault();
		if (loading) return;
		setLoading(true);

		try {
			const res = await fetch("/api/tickets/delete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ticketId }),
			});

			const json = await res.json();

			if (res.ok && json?.success) {
				toast.success(json.message || "Ticket deleted");
				onClose?.();
				setTimeout(() => router.replace("/tickets"), 150);
			} else {
				toast.error(json?.message || "Failed to delete ticket");
				console.warn("Delete failed", { status: res.status, body: json });
			}
		} catch (err) {
			console.error("Network error during delete:", err);
			toast.error("Network error while deleting ticket");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleDelete} className="flex gap-3">
			<button
				type="button"
				onClick={onClose}
				className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
				disabled={loading}>
				Cancel
			</button>
			<button
				type="submit"
				className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
				disabled={loading}>
				{loading ? "Deleting…" : "Delete"}
			</button>
		</form>
	);
}
