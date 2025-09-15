import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/db/prisma";
import { Prisma } from "@/generated/prisma";

type AuditPageProps = {
	searchParams?: Record<string, string | string[] | undefined>;
};

const AuditPage = async ({ searchParams }: AuditPageProps) => {
	const user = await getCurrentUser();

	if (!user || user.role !== "ADMIN") {
		notFound();
	}

	const page = Math.max(Number(searchParams?.page ?? 1), 1);
	const pageSize = Math.min(Number(searchParams?.pageSize ?? 20), 100);
	const skip = (page - 1) * pageSize;

	const where: Prisma.AuditLogWhereInput = {};
	if (searchParams?.userId) where.userId = String(searchParams.userId);
	if (searchParams?.action)
		where.action = {
			contains: String(searchParams.action),
			mode: "insensitive",
		};
	if (searchParams?.resourceType)
		where.resourceType = String(searchParams.resourceType);
	if (searchParams?.resourceId)
		where.resourceId = String(searchParams.resourceId);
	if (searchParams?.start || searchParams?.end) {
		where.createdAt = {};
		if (searchParams.start)
			where.createdAt.gte = new Date(String(searchParams.start));
		if (searchParams.end)
			where.createdAt.lte = new Date(String(searchParams.end));
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
				userId: true,
				resourceType: true,
				resourceId: true,
				createdAt: true,
				before: true,
				after: true,
			},
		}),
		prisma.auditLog.count({ where }),
	]);

	type AuditLogListItem = (typeof logs)[number];

	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold mb-4">Audit Logs</h1>
			<p className="text-sm mb-4">
				Showing {skip + 1} - {Math.min(skip + pageSize, total)} of {total}
			</p>
			<div className="space-y-2">
				{logs.map((l: AuditLogListItem) => (
					<div key={l.id} className="border p-3 rounded bg-white">
						<div className="flex justify-between">
							<div>
								<div className="text-sm text-gray-500">
									{new Date(l.createdAt).toLocaleString()}
								</div>
								<div className="font-medium">
									{l.action} — {l.resourceType}
									{l.resourceId ? ` #${l.resourceId}` : ""}
								</div>
								<div className="text-xs text-gray-600">
									user: {l.userId ?? "anon"}
								</div>
							</div>
							<div>
								<a href={`/admin/audit/${l.id}`} className="text-blue-600">
									View
								</a>
							</div>
						</div>
						<pre className="mt-2 text-xs max-h-24 overflow-auto bg-gray-50 p-2 rounded">
							{JSON.stringify(l.before ?? l.after ?? {}, null, 2).slice(
								0,
								1000
							)}
							{JSON.stringify(l.before ?? l.after ?? {}, null, 2).length > 1000
								? " ...(truncated)"
								: ""}
						</pre>
					</div>
				))}
			</div>
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
