import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/db/prisma";
import { Prisma } from "@/generated/prisma";
import { redirect } from "next/navigation";

type AuditPageProps = {
	searchParams?: Record<string, string | string[] | undefined>;
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
		case "ticket.update":
			return `Edited ticket ${log.resourceId ? `#${log.resourceId}` : ""}`;
		case "ticket.delete":
			return `Deleted ticket ${log.resourceId ? `#${log.resourceId}` : ""}`;
		default:
			return `${log.action} — ${log.resourceType}${
				log.resourceId ? ` #${log.resourceId}` : ""
			}`;
	}
}

const AuditPage = async ({ searchParams }: AuditPageProps) => {
	const params: Record<string, string | string[] | undefined> =
		searchParams ?? {};

	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}
	if (user.role !== "ADMIN") {
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
		if (params.start) {
			const s = new Date(String(params.start));
			if (!Number.isNaN(s.getTime())) where.createdAt.gte = s;
		}

		if (params.end) {
			const e = new Date(String(params.end));
			if (!Number.isNaN(e.getTime())) {
				e.setHours(23, 59, 59, 999);
				where.createdAt.lte = e;
			}
		}
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

	// Filter options
	const users = await prisma.user.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});

	function paramToDateInput(val?: string | string[] | undefined) {
		if (!val) return "";
		const s = Array.isArray(val) ? val[0] : val;
		const d = new Date(s);
		if (Number.isNaN(d.getTime())) return "";
		return d.toISOString().slice(0, 10);
	}

	return (
		<div className="p-6 mx-44">
			<h1 className="text-3xl font-bold mb-4 text-blue-600 text-center">
				Audit Logs
			</h1>

			<form
				method="get"
				className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
				<div>
					<label className="block text-xs text-gray-600 mb-1">User</label>
					<select
						name="userId"
						defaultValue={params?.userId ? String(params.userId) : ""}
						className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
						<option value="">All users</option>
						{users.map((u) => (
							<option key={u.id} value={u.id}>
								{u.name ?? u.id}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-xs text-gray-600 mb-1">Start</label>
					<input
						type="date"
						name="start"
						defaultValue={paramToDateInput(params.start)}
						className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
					/>
				</div>

				<div>
					<label className="block text-xs text-gray-600 mb-1">End</label>
					<input
						type="date"
						name="end"
						defaultValue={paramToDateInput(params.end)}
						className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
					/>
				</div>

				<div className="flex gap-2 justify-start lg:justify-end">
					<button
						type="submit"
						className="px-4 py-2 bg-blue-600 text-white rounded text-sm shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
						Apply
					</button>

					<a
						role="button"
						href="/admin/audit"
						className="px-4 py-2 border rounded text-sm inline-flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
						Clear
					</a>
				</div>
			</form>

			<div className="overflow-x-auto rounded-lg shadow">
				<table className="min-w-full text-sm border-collapse">
					<thead className="bg-blue-600 text-white ">
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

			<p className="text-sm my-4">
				Showing {skip + 1} - {Math.min(skip + pageSize, total)} of {total}
			</p>

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
