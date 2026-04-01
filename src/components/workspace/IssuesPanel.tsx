import { useMemo } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { WorkspaceIssue } from "@/api/analysisApi";

const severityConfig = {
  high: { icon: AlertCircle, classes: "severity-high", label: "High" },
  medium: { icon: AlertTriangle, classes: "severity-medium", label: "Medium" },
  low: { icon: Info, classes: "severity-low", label: "Low" },
};

const issueTypeLabel: Record<WorkspaceIssue["type"], string> = {
  COMPILER_ERROR: "Compiler",
  WARNING: "Warning",
  PERFORMANCE: "Performance",
  MAINTAINABILITY: "Maintainability",
  SECURITY: "Security",
  STYLE: "Style",
};

interface IssuesPanelProps {
  issues: WorkspaceIssue[];
}

const IssuesPanel = ({ issues }: IssuesPanelProps) => {
  const groupedIssues = useMemo(() => {
    const groups = new Map<string, WorkspaceIssue & { lines: number[]; occurrences: number }>();

    for (const issue of issues) {
      const key = [
        issue.type,
        issue.severity,
        issue.title,
        issue.explanation,
        issue.suggestion,
        issue.impact,
      ].join("::");

      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          ...issue,
          lines: [issue.line],
          occurrences: 1,
        });
        continue;
      }

      if (!existing.lines.includes(issue.line)) {
        existing.lines.push(issue.line);
        existing.lines.sort((a, b) => a - b);
      }
      existing.occurrences += 1;
    }

    return Array.from(groups.values());
  }, [issues]);

  return (
    <div className="p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          {groupedIssues.length} grouped issues from {issues.length} findings
        </span>
      </div>
      {groupedIssues.map((issue) => {
        const config = severityConfig[issue.severity];
        const Icon = config.icon;
        const linesLabel = issue.lines.length === 1
          ? `Line ${issue.lines[0]}`
          : `Lines ${issue.lines.join(", ")}`;
        return (
          <div key={issue.id} className="bg-surface rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-semibold text-foreground">{issue.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-background/40">
                  {issueTypeLabel[issue.type]}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.classes}`}>
                  {config.label}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground font-mono">
              <p>{linesLabel}</p>
              {issue.occurrences > 1 && <p>{issue.occurrences} occurrences</p>}
            </div>
            <p className="text-[11px] text-muted-foreground">{issue.explanation}</p>
            <div className="bg-primary/5 border border-primary/10 rounded p-2">
              <p className="text-[11px] text-primary font-medium">Fix: {issue.suggestion}</p>
            </div>
            <p className="text-[10px] text-muted-foreground italic">Impact: {issue.impact}</p>
          </div>
        );
      })}
    </div>
  );
};

export default IssuesPanel;
