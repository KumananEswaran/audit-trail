"use client";

import { useActionState, useEffect, useState } from "react";
import { logoutUser } from "@/actions/auth.actions";
import { toast } from "sonner";

const LogoutButton = () => {
	const initialState = {
		success: false,
		message: "",
	};

	const [state, formAction] = useActionState(logoutUser, initialState);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (state.success) {
			toast.success("Logout successful");
		} else if (state.message) {
			toast.error(state.message);
		}
	}, [state]);

	return (
		<form action={formAction} onSubmit={() => setSubmitting(true)}>
			<button
				type="submit"
				className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
				disabled={submitting}>
				{submitting ? "Logging out…" : "Logout"}
			</button>
		</form>
	);
};

export default LogoutButton;
