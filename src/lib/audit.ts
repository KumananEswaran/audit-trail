import { prisma } from "@/db/prisma";
import type { Prisma } from "@prisma/client";

// Define the shape of the options to pass when writing an audit log
type LogAuditOptions = {
	userId?: string | null; // ID of the user who did the action
	action: string; // What happened, e.g. "ticket.create"
	resourceType: string; // What type of thing was changed, e.g "Ticket"
	resourceId: string | number | null; // Id of that thing
	before?: unknown; // Data before the change
	after?: unknown; // Data after the change
	metadata?: Record<string, unknown>; // Extra info like IP address, browser
	transactional?: { prismaTx: Prisma.TransactionClient }; // If inside a DB transaction, use that client instead of the normal prisma
};

// List of keys don't want to store in logs
const DEFAULT_REDACT_KEYS = ["password", "token", "ssn"];

/**
 * Helper function: goes through an object and hides any sensitive info
 * Also shortens very long strings to avoid bloating the database
 */
function redact(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	obj: any,
	redactKeys = DEFAULT_REDACT_KEYS,
	maxStr = 10000
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
	if (obj == null) return obj;

	if (typeof obj === "string") {
		if (obj.length > maxStr) return obj.slice(0, maxStr) + "...(truncated)";
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((v) => redact(v, redactKeys, maxStr));
	}

	if (typeof obj === "object") {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const out: any = {};
		for (const k of Object.keys(obj)) {
			if (redactKeys.includes(k.toLowerCase())) {
				out[k] = "[REDACTED]";
			} else {
				out[k] = redact(obj[k], redactKeys, maxStr);
			}
		}

		return out;
	}

	return obj;
}

/**
 * Main function: write an audit log entry to the database
 */

export async function logAudit(opts: LogAuditOptions): Promise<void> {
	const {
		userId = null,
		action,
		resourceType,
		resourceId,
		before,
		after,
		metadata,
		transactional,
	} = opts;

	const beforeSafe = before ? redact(before) : null;
	const afterSafe = after ? redact(after) : null;
	const metadataSafe = metadata ? redact(metadata) : null;

	try {
		const createData = {
			userId,
			action,
			resourceType,
			resourceId: resourceId != null ? String(resourceId) : null,
			before: beforeSafe,
			after: afterSafe,
			metadata: metadataSafe,
		};

		if (transactional?.prismaTx) {
			await transactional.prismaTx.auditLog.create({ data: createData });
		} else {
			await prisma.auditLog.create({ data: createData });
		}
	} catch (error) {
		console.error(
			"Failed to write audit log",
			{ action, resourceType, resourceId },
			error
		);
	}
}
