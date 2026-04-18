export type ProfileAccent = "emerald" | "ocean" | "sunset" | "rose";

export type ProfileAccentOption = {
	value: ProfileAccent;
	label: string;
	classes: string;
};

export const profileAccentOptions: ProfileAccentOption[] = [
	{ value: "emerald", label: "Emerald", classes: "from-emerald-500 to-teal-400" },
	{ value: "ocean", label: "Ocean", classes: "from-sky-500 to-cyan-400" },
	{ value: "sunset", label: "Sunset", classes: "from-orange-500 to-amber-400" },
	{ value: "rose", label: "Rose", classes: "from-rose-500 to-pink-400" },
];

export function getProfileAccent(accentColor?: string): ProfileAccentOption {
	return profileAccentOptions.find((option) => option.value === accentColor) ?? profileAccentOptions[0];
}