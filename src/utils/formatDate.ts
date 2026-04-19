function normalizeApiDateInput(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return trimmed;
	}

	// Backend may send LocalDateTime without timezone info; treat it as UTC.
	const hasZoneInfo = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
	return hasZoneInfo ? trimmed : `${trimmed}Z`;
}

export function formatSystemDateTime(value: string | Date | null | undefined): string {
	if (!value) {
		return "-";
	}

	const parsed =
		value instanceof Date
			? value
			: new Date(typeof value === "string" ? normalizeApiDateInput(value) : value);

	if (Number.isNaN(parsed.getTime())) {
		return typeof value === "string" ? value : "-";
	}

	return parsed.toLocaleString();
}

export function formatSystemDate(value: string | Date | null | undefined): string {
	if (!value) {
		return "-";
	}

	const parsed =
		value instanceof Date
			? value
			: new Date(typeof value === "string" ? normalizeApiDateInput(value) : value);

	if (Number.isNaN(parsed.getTime())) {
		return typeof value === "string" ? value : "-";
	}

	return parsed.toLocaleDateString();
}
