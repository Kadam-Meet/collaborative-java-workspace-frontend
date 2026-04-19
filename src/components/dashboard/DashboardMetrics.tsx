import { Activity, BarChart3, FileCode2, FolderKanban, GitBranch, ShieldAlert } from "lucide-react";
import type { DashboardPerformance, DashboardTotals } from "@/types/workspace.types";

interface DashboardMetricsProps {
  totals: DashboardTotals;
  performance: DashboardPerformance;
  onMetricClick?: (metricLabel: string) => void;
}

const DashboardMetrics = ({ totals, performance, onMetricClick }: DashboardMetricsProps) => {
  const metrics = [
    { label: "Rooms", value: totals.rooms, icon: FolderKanban, color: "text-primary" },
    { label: "Files", value: totals.files, icon: FileCode2, color: "text-accent" },
    { label: "Versions", value: totals.versions, icon: GitBranch, color: "text-warning" },
    { label: "Analyses", value: totals.analyses, icon: BarChart3, color: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <button
            key={m.label}
            type="button"
            className="stat-card text-left"
            onClick={() => onMetricClick?.(m.label)}
          >
            <div className="flex items-center justify-between mb-2">
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{performance.averageScore}</p>
          <p className="text-xs text-muted-foreground mt-1">Average Performance</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-5 w-5 text-accent" />
          </div>
          <p className="text-2xl font-bold text-foreground">{performance.bestScore}</p>
          <p className="text-xs text-muted-foreground mt-1">Best Performance</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-foreground">{performance.latestRiskLevel}</p>
          <p className="text-xs text-muted-foreground mt-1">Latest Risk Level</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardMetrics;
