"use server";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { logAudit } from "@/lib/audit";

export async function createTicket(
	prevState: { success: boolean; message: string },
	formData: FormData
): Promise<{ success: boolean; message: string }> {
	try {
		const user = await getCurrentUser();

		if (!user) {
			return {
				success: false,
				message: "You must be logged in to create a ticket",
			};
		}

		const subject = formData.get("subject") as string;
		const description = formData.get("description") as string;
		const priority = formData.get("priority") as string;

		if (!subject || !description || !priority) {
			return { success: false, message: "All fields are required" };
		}

		// Create ticket
		const ticket = await prisma.ticket.create({
			data: {
				subject,
				description,
				priority,
				user: { connect: { id: user.id } },
			},
		});

		await logAudit({
			userId: user.id,
			action: "ticket.create",
			resourceType: "Ticket",
			resourceId: ticket.id,
			after: ticket,
		});

		revalidatePath("/tickets");

		return { success: true, message: "Ticket created successfully" };
	} catch {
		return {
			success: false,
			message: "An error occured while creating the ticket",
		};
	}
}

export async function getTickets(
	useParam?: { id: string; role?: string } | null
) {
	try {
		const user = useParam ?? (await getCurrentUser());

		if (!user) {
			return [];
		}

		// If Admin, return all tickets
		const where = user.role === "ADMIN" ? {} : { userId: user.id };
		const tickets = await prisma.ticket.findMany({
			where,
			orderBy: { createdAt: "desc" },
		});

		return tickets;
	} catch {
		return [];
	}
}

export async function getTicketById(id: string) {
	try {
		const ticket = await prisma.ticket.findUnique({
			where: { id: Number(id) },
		});
		return ticket;
	} catch {
		return null;
	}
}

// Close Ticket
export async function closeTicket(
	prevState: { success: boolean; message: string },
	formData: FormData
): Promise<{ success: boolean; message: string }> {
	const ticketId = Number(formData.get("ticketId"));

	if (!ticketId) {
		return { success: false, message: "Ticket ID is required" };
	}

	const user = await getCurrentUser();

	if (!user) {
		return { success: false, message: "Unauthorized" };
	}

	// const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

	// if (!ticket || ticket.userId !== user.id) {
	// 	return {
	// 		success: false,
	// 		message: "You are not authorized to close this ticket",
	// 	};
	// }

	// await prisma.ticket.update({
	// 	where: { id: ticketId },
	// 	data: { status: "Closed" },
	// });

	return await prisma.$transaction(async (tx) => {
		const before = await tx.ticket.findUnique({ where: { id: ticketId } });

		if (!before || before.userId !== user.id) {
			return {
				success: false,
				message: "You are not authorized to close this ticket",
			};
		}

		const updated = await tx.ticket.update({
			where: { id: ticketId },
			data: { status: "Closed" },
		});

		await tx.auditLog.create({
			data: {
				userId: user.id,
				action: "ticket.close",
				resourceType: "Ticket",
				resourceId: String(ticketId),
				before,
				after: updated,
			},
		});

		revalidatePath("/tickets");
		revalidatePath(`/tickets/${ticketId}`);

		return { success: true, message: "Ticket has closed successfully " };
	});
}
