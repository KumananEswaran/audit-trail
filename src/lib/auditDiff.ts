// src/lib/auditDiff.ts
import type { Prisma } from "@/generated/prisma";

type Change = { keyPath: string; before: unknown; after: unknown };

function stringifyValue(v: unknown, max = 200) {
	if (v === null || v === undefined) return String(v);
	if (typeof v === "string") {
		const s = v.replace(/\n+/g, " ");
		if (s.length <= max) return `"${s}"`;
		return `"${s.slice(0, max)}... (truncated)"`;
	}
	try {
		const s = typeof v === "object" ? JSON.stringify(v) : String(v);
		return s.length > max ? `${s.slice(0, max)}...` : s;
	} catch {
		return String(v);
	}
}

function deepEqual(a: unknown, b: unknown): boolean {
	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch {
		return a === b;
	}
}

function capitalize(s: string) {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatAuditChanges(
	before: Prisma.JsonValue | null | undefined,
	after: Prisma.JsonValue | null | undefined,
	opts?: { maxFields?: number; maxValueLength?: number }
): string[] {
	const maxFields = opts?.maxFields ?? 3;
	const maxValueLength = opts?.maxValueLength ?? 200;

	if (!before && !after) return [];

	const isPlainObject = (v: unknown): v is Record<string, unknown> =>
		v !== null && typeof v === "object" && !Array.isArray(v);

	const b = isPlainObject(before) ? (before as Record<string, unknown>) : {};
	const a = isPlainObject(after) ? (after as Record<string, unknown>) : {};

	const keys = Array.from(
		new Set([...Object.keys(b), ...Object.keys(a)])
	).sort();

	const changes: Change[] = [];

	for (const k of keys) {
		const vb = (b as Record<string, unknown>)[k];
		const va = (a as Record<string, unknown>)[k];

		if (deepEqual(vb, va)) continue;

		if (
			vb != null &&
			va != null &&
			typeof vb === "object" &&
			typeof va === "object" &&
			!Array.isArray(vb) &&
			!Array.isArray(va)
		) {
			const nestedKeys = Array.from(
				new Set([
					...Object.keys(vb as Record<string, unknown>),
					...Object.keys(va as Record<string, unknown>),
				])
			).slice(0, 3);
			let nestedDiffFound = false;
			for (const nk of nestedKeys) {
				const nb = (vb as Record<string, unknown>)[nk];
				const na = (va as Record<string, unknown>)[nk];
				if (!deepEqual(nb, na)) {
					changes.push({
						keyPath: `${k}.${nk}`,
						before: nb,
						after: na,
					});
					nestedDiffFound = true;
				}
				if (changes.length >= maxFields) break;
			}
			if (nestedDiffFound) {
				if (changes.length >= maxFields) break;
				continue;
			}
			changes.push({ keyPath: k, before: vb, after: va });
		} else {
			changes.push({ keyPath: k, before: vb, after: va });
		}

		if (changes.length >= maxFields) break;
	}

	return changes.map((c) => {
		const parts = c.keyPath.split(".");
		parts[0] = capitalize(parts[0]);
		const displayedKey = parts.join(".");

		const left = stringifyValue(c.before, maxValueLength);
		const right = stringifyValue(c.after, maxValueLength);
		return `${displayedKey}: ${left} changed to ${right}`;
	});
}
