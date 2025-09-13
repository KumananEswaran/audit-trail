"use server";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";

export async function createTicket(
	prevState: { success: boolean; message: string },
	formData: FormData
): Promise<{ success: boolean; message: string }> {
	try {
		const subject = formData.get("subject") as string;
		const description = formData.get("description") as string;
		const priority = formData.get("priority") as string;

		if (!subject || !description || !priority) {
			return { success: false, message: "All fields are required" };
		}

		// Create ticket
		const ticket = await prisma.ticket.create({
			data: { subject, description, priority },
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
		const tickets = await prisma.ticket.findMany({
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
