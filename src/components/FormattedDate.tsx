"use client";
import React from "react";

type Props = {
	iso: string;
	className?: string;
};

export default function FormattedDate({ iso, className }: Props) {
	const d = new Date(iso);
	const formatted = new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	}).format(d);

	return <span className={className}>{formatted}</span>;
}
