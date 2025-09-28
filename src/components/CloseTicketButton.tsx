"use client";

import { useActionState, useEffect, useState } from "react";
import { closeTicket } from "@/actions/tickets.actions";
import { toast } from "sonner";

const CloseTicketButton = ({
	ticketId,
	isClosed,
}: {
	ticketId: number;
	isClosed: boolean;
}) => {
	const initialState = {
		success: false,
		message: "",
	};

	const [state, formAction] = useActionState(closeTicket, initialState);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (state.success) {
			toast.success(state.message);
		} else if (state.message && !state.success) {
			toast.error(state.message);
		}
		if (state.message) setSubmitting(false);
	}, [state]);

	if (isClosed) return null;

	return (
		<form action={formAction} onSubmit={() => setSubmitting(true)}>
			<input type="hidden" name="ticketId" value={ticketId} />
			<button
				type="submit"
				className="bg-red-500 text-white px-3 py-3 w-full rounded hover:bg-red-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
				disabled={submitting}>
				{submitting ? "Closing…" : "Close Ticket"}
			</button>
		</form>
	);
};

export default CloseTicketButton;
