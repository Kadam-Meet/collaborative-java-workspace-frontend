import { Button } from "@/components/ui/button";
import { GitBranch, RotateCcw, Trash2 } from "lucide-react";
import type { VersionEntry } from "@/types/workspace.types";
import { formatSystemDateTime } from "@/utils/formatDate";

interface VersionHistoryProps {
	versions: VersionEntry[];
	onRevert: (versionId: number) => Promise<void>;
	onDelete: (versionId: number) => Promise<void>;
	onCompare?: (versionId: number) => Promise<void>;
	onDirectMerge?: (versionId: number) => Promise<void>;
	onCompareMerge?: (versionId: number) => Promise<void>;
	loading?: boolean;
	canRevert?: boolean;
	canDelete?: boolean;
	canMerge?: boolean;
}


const VersionHistory = ({
	versions,
	onRevert,
	onDelete,
	onCompare,
	onDirectMerge,
	onCompareMerge,
	loading = false,
	canRevert = false,
	canDelete = false,
	canMerge = false,
}: VersionHistoryProps) => {
	const visibleVersions = versions.slice(0, 5);

	if (loading) {
		return <p className="text-[11px] text-muted-foreground">Loading version history...</p>;
	}

	if (visibleVersions.length === 0) {
		return <p className="text-[11px] text-muted-foreground">No versions yet</p>;
	}

	return (
		<div className="space-y-2">
			{visibleVersions.map((version) => {
				const versionTag = version.versionLabel || version.message;
				return (
				<div key={version.id} className="bg-surface rounded-md p-2.5 group border border-border/60">
					<div className="flex items-center justify-between gap-2 min-w-0">
						<div className="flex items-center gap-1 min-w-0">
							<GitBranch className="h-3 w-3 text-primary flex-shrink-0" />
							<span className="text-xs font-semibold text-foreground flex-shrink-0">v{version.versionNumber}</span>
							{versionTag && (
								<span className="text-xs text-muted-foreground truncate">({versionTag})</span>
							)}
						</div>
					</div>
					<div className="mt-2 flex flex-wrap items-center gap-1.5">
							{canRevert && (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-[10px]"
									onClick={() => void onRevert(version.id)}
								>
									<RotateCcw className="h-2.5 w-2.5 mr-0.5" /> Revert
								</Button>
							)}
							{canDelete && (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-[10px]"
									onClick={() => void onDelete(version.id)}
								>
									<Trash2 className="h-2.5 w-2.5 mr-0.5" /> Delete
								</Button>
							)}
							{onCompare && (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-[10px]"
									onClick={() => void onCompare(version.id)}
								>
									Compare
								</Button>
							)}
							{canMerge && onCompareMerge && (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-[10px]"
									onClick={() => void onCompareMerge(version.id)}
								>
									Compare+Merge
								</Button>
							)}
							{canMerge && onDirectMerge && (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-[10px]"
									onClick={() => void onDirectMerge(version.id)}
								>
									Direct Merge
								</Button>
							)}
						</div>
					<p className="text-[11px] text-muted-foreground truncate">{version.contentPreview || "(empty snapshot)"}</p>
					<p className="text-[10px] text-muted-foreground mt-0.5">
						{(version.authorName || version.authorEmail || "Unknown") + " • " + formatSystemDateTime(version.createdAt)}
					</p>
				</div>
				);
			})}
		</div>
	);
};

export default VersionHistory;
