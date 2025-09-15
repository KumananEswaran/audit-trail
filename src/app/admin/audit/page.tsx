import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/db/prisma";
import { Prisma } from "@/generated/prisma";

type AuditPageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// Convert raw action to a readable message
function formatAction(log: {
	action: string;
	resourceType: string;
	resourceId: string | null;
}) {
	switch (log.action) {
		case "auth.login":
			return "Logged in to the system";
		case "auth.logout":
			return "Logged out of the system";
		case "auth.register":
			return "Registered a new account";
		case "ticket.create":
			return `Created ticket ${log.resourceId ? `#${log.resourceId}` : ""}`;
		case "ticket.close":
			return `Closed ticket ${log.resourceId ? `#${log.resourceId}` : ""}`;
		default:
			return `${log.action} — ${log.resourceType}${
				log.resourceId ? ` #${log.resourceId}` : ""
			}`;
	}
}

const AuditPage = async ({ searchParams }: AuditPageProps) => {
	const params = await searchParams;

	const user = await getCurrentUser();

	if (!user || user.role !== "ADMIN") {
		notFound();
	}

	const page = Math.max(Number(params?.page ?? 1), 1);
	const pageSize = Math.min(Number(params?.pageSize ?? 20), 100);
	const skip = (page - 1) * pageSize;

	const where: Prisma.AuditLogWhereInput = {};
	if (params?.userId) where.userId = String(params.userId);
	if (params?.action) {
		where.action = {
			contains: String(params.action),
			mode: "insensitive",
		};
	}
	if (params?.resourceType) where.resourceType = String(params.resourceType);
	if (params?.resourceId) where.resourceId = String(params.resourceId);
	if (params?.start || params?.end) {
		where.createdAt = {};
		if (params.start) where.createdAt.gte = new Date(String(params.start));
		if (params.end) where.createdAt.lte = new Date(String(params.end));
	}

	const [logs, total] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			orderBy: { createdAt: "desc" },
			take: pageSize,
			skip,
			select: {
				id: true,
				action: true,
				resourceType: true,
				resourceId: true,
				createdAt: true,
				user: {
					select: {
						name: true,
					},
				},
			},
		}),
		prisma.auditLog.count({ where }),
	]);

	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold mb-4 text-blue-600">Audit Logs</h1>
			<p className="text-sm mb-4">
				Showing {skip + 1} - {Math.min(skip + pageSize, total)} of {total}
			</p>

			{/* Table */}
			<div className="overflow-x-auto rounded-lg shadow">
				<table className="min-w-full text-sm border-collapse">
					<thead className="bg-blue-600 text-white">
						<tr className="divide-x divide-white/40">
							<th className="px-3 py-2 text-left">No</th>
							<th className="px-3 py-2 text-left">Date</th>
							<th className="px-3 py-2 text-left">Time</th>
							<th className="px-3 py-2 text-left">User</th>
							<th className="px-3 py-2 text-left">Action</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{logs.map((l, i) => {
							const createdAt = new Date(l.createdAt);
							const date = createdAt.toLocaleDateString();
							const time = createdAt.toLocaleTimeString();
							const username = l.user?.name ?? "Anonymous";

							return (
								<tr
									key={l.id}
									className="hover:bg-gray-50 divide-x divide-gray-200">
									<td className="px-3 py-2">{skip + i + 1}</td>
									<td className="px-3 py-2">{date}</td>
									<td className="px-3 py-2">{time}</td>
									<td className="px-3 py-2">{username}</td>
									<td className="px-3 py-2">{formatAction(l)}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<div className="mt-4 flex gap-2">
				{page > 1 && (
					<a href={`?page=${page - 1}`} className="px-3 py-1 border rounded">
						Previous
					</a>
				)}
				{skip + pageSize < total && (
					<a href={`?page=${page + 1}`} className="px-3 py-1 border rounded">
						Next
					</a>
				)}
			</div>
		</div>
	);
};

export default AuditPage;
