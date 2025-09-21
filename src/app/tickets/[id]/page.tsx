import { getTicketById } from "@/actions/tickets.actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPriorityClass } from "@/utils/ui";
import CloseTicketButton from "@/components/CloseTicketButton";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import TicketActions from "../TicketActions";

const TicketDetailsPage = async (props: {
	params: Promise<{ id: string }>;
}) => {
	const { id } = await props.params;
	const ticket = await getTicketById(id);

	const user = await getCurrentUser();

	const isOwner = user?.id === ticket?.userId;
	const isAdmin = user?.role === "ADMIN";
	const canModify = Boolean(isOwner || isAdmin);

	if (!user) redirect("/login");

	if (!ticket) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-blue-50 p-8">
			<div className="max-w-2xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-8 space-y-6">
				<h1 className="text-3xl font-bold text-blue-600">{ticket.subject}</h1>

				<div className="text-gray-700">
					<h2 className="text-lg font-semibold mb-2">Description</h2>
					<p>{ticket.description}</p>
				</div>

				<div className="text-gray-700">
					<h2 className="text-lg font-semibold mb-2">Priority</h2>
					<p className={getPriorityClass(ticket.priority)}>{ticket.priority}</p>
				</div>

				<div className="text-gray-700">
					<h2 className="text-lg font-semibold mb-2">Created At</h2>
					<p>{new Date(ticket.createdAt).toLocaleString()}</p>
				</div>

				<div className="flex justify-between">
					<Link
						href="/tickets"
						className=" bg-blue-600 text-white px-4 pt-3 rounded hover:bg-blue-700 transition">
						← Back to Tickets
					</Link>
					<div className="flex items-center justify-end gap-3 mb-2">
						{canModify && <TicketActions ticket={ticket} />}
					</div>
				</div>

				{ticket.status !== "Closed" && (
					<CloseTicketButton
						ticketId={ticket.id}
						isClosed={ticket.status === "Closed"}
					/>
				)}
			</div>
		</div>
	);
};

export default TicketDetailsPage;
