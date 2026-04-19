import { Button } from "@/components/ui/button";
import { GitBranch, RotateCcw, Trash2 } from "lucide-react";
import type { VersionEntry } from "@/types/workspace.types";

interface VersionHistoryProps {
	versions: VersionEntry[];
	onRevert: (versionId: number) => Promise<void>;
	onDelete: (versionId: number) => Promise<void>;
	onCompare?: (versionId: number) => Promise<void>;
	loading?: boolean;
	canRevert?: boolean;
	canDelete?: boolean;
}


const VersionHistory = ({ versions, onRevert, onDelete, onCompare, loading = false, canRevert = false, canDelete = false }: VersionHistoryProps) => {
	const visibleVersions = versions.slice(0, 5);

	if (loading) {
		return <p className="text-[11px] text-muted-foreground">Loading version history...</p>;
	}

	if (visibleVersions.length === 0) {
		return <p className="text-[11px] text-muted-foreground">No versions yet</p>;
	}

	return (
		<div className="space-y-2">
			{visibleVersions.map((version) => (
				<div key={version.id} className="bg-surface rounded-md p-2 group">
					<div className="flex items-center justify-between mb-1">
						<div className="flex items-center gap-1">
							<GitBranch className="h-3 w-3 text-primary" />
							<span className="text-xs font-semibold text-foreground">v{version.versionNumber}</span>
						</div>
						{canRevert && (
							<Button
								variant="ghost"
								size="sm"
								className="h-5 px-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={() => void onRevert(version.id)}
							>
								<RotateCcw className="h-2.5 w-2.5 mr-0.5" /> Revert
							</Button>
						)}
						{canDelete && (
							<Button
								variant="ghost"
								size="sm"
								className="h-5 px-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={() => void onDelete(version.id)}
							>
								<Trash2 className="h-2.5 w-2.5 mr-0.5" /> Delete
							</Button>
						)}
						{onCompare && (
							<Button
								variant="ghost"
								size="sm"
								className="h-5 px-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={() => void onCompare(version.id)}
							>
								Compare
							</Button>
						)}
					</div>
					<p className="text-[11px] text-muted-foreground truncate">{version.contentPreview || "(empty snapshot)"}</p>
					<p className="text-[10px] text-muted-foreground mt-0.5">
						{(version.authorName || version.authorEmail || "Unknown") + " • " + new Date(version.createdAt).toLocaleString()}
					</p>
				</div>
			))}
		</div>
	);
};

export default VersionHistory;
