// src/app/api/tickets/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const ticketId = Number(body?.ticketId);
		if (!ticketId) {
			return NextResponse.json(
				{ success: false, message: "Ticket ID is required" },
				{ status: 400 }
			);
		}

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		const existing = await prisma.ticket.findUnique({
			where: { id: ticketId },
		});
		if (!existing) {
			return NextResponse.json(
				{ success: false, message: "Ticket not found" },
				{ status: 404 }
			);
		}

		const isOwner = existing.userId === user.id;
		const isAdmin = user.role === "ADMIN";
		if (!isOwner && !isAdmin) {
			return NextResponse.json(
				{ success: false, message: "Not authorized" },
				{ status: 403 }
			);
		}

		await prisma.ticket.delete({ where: { id: ticketId } });

		await logAudit({
			userId: user.id,
			action: "ticket.delete",
			resourceType: "Ticket",
			resourceId: String(ticketId),
			before: existing,
		});

		revalidatePath("/tickets");
		revalidatePath(`/tickets/${ticketId}`);

		return NextResponse.json({ success: true, message: "Ticket deleted" });
	} catch (err) {
		console.error("API delete error:", err);
		const message =
			err instanceof Error ? err.message : "Failed to delete ticket";
		return NextResponse.json({ success: false, message }, { status: 500 });
	}
}
