"use server";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";

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

		revalidatePath("/tickets");

		return { success: true, message: "Ticket created successfully" };
	} catch {
		return {
			success: false,
			message: "An error occured while creating the ticket",
		};
	}
}

export async function getTickets() {
	try {
		const user = await getCurrentUser();

		if (!user) {
			return [];
		}

		const tickets = await prisma.ticket.findMany({
			where: { userId: user.id },
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
