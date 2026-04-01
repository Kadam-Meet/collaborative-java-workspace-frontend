import { apiJson } from "@/api/axiosClient";

export type IssueSeverity = "high" | "medium" | "low";
export type IssueType =
	| "COMPILER_ERROR"
	| "WARNING"
	| "PERFORMANCE"
	| "MAINTAINABILITY"
	| "SECURITY"
	| "STYLE";

export interface WorkspaceIssue {
	id: string;
	type: IssueType;
	title: string;
	line: number;
	severity: IssueSeverity;
	explanation: string;
	suggestion: string;
	impact: string;
	ruleName?: string;
	category?: string;
	fixSuggestion?: string;
}

export interface WorkspaceAnalysis {
	cyclomaticComplexity: number;
	maxComplexity: number;
	timeComplexity: string;
	performanceScore: number;
	riskLevel: "High" | "Medium" | "Low";
	linesOfCode: number;
	methodCount: number;
}

interface FullReviewApiResponse {
	optimization: {
		issues: Array<{
			id: string;
			type: IssueType;
			title: string;
			line: number;
			severity: "HIGH" | "MEDIUM" | "LOW";
			explanation: string;
			suggestedFix: string;
			fixSuggestion?: string;
			impact: string;
			ruleName?: string;
			category?: string;
		}>;
	};
	analysis: {
		complexity: {
			cyclomaticComplexity: number;
			estimatedTimeComplexity: string;
			performanceScore: number;
			riskLevel: "High" | "Medium" | "Low";
			totalLines: number;
			methodCount: number;
		};
	};
}

interface AnalysisJobStartResponse {
	jobId: string;
	status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
	createdAt: string;
}

interface AnalysisJobStatusResponse {
	jobId: string;
	status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
	createdAt: string;
	startedAt?: string | null;
	completedAt?: string | null;
	error?: string;
	result?: FullReviewApiResponse;
}

export interface WorkspaceReviewResult {
	analysis: WorkspaceAnalysis;
	issues: WorkspaceIssue[];
}

function buildWorkspacePayload(code: string, workspaceName: string, notifyOnCompletion: boolean) {
	return {
		workspaceName,
		entryFile: "src/DataProcessor.java",
		notifyOnCompletion,
		files: {
			"src/DataProcessor.java": code,
		},
	};
}

export async function queueJavaAnalysis(
	code: string,
	workspaceName: string,
	notifyOnCompletion: boolean
): Promise<AnalysisJobStartResponse> {
	return apiJson<AnalysisJobStartResponse>("/api/v1/analyzer/java/jobs", {
		method: "POST",
		auth: true,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(buildWorkspacePayload(code, workspaceName, notifyOnCompletion)),
	});
}

export async function getJavaAnalysisJobStatus(jobId: string): Promise<AnalysisJobStatusResponse> {
	return apiJson<AnalysisJobStatusResponse>(`/api/v1/analyzer/java/jobs/${jobId}`, {
		method: "GET",
		auth: true,
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function mapFullReview(payload: FullReviewApiResponse): WorkspaceReviewResult {
	return {
		analysis: {
			cyclomaticComplexity: payload.analysis.complexity.cyclomaticComplexity,
			maxComplexity: Math.max(payload.analysis.complexity.cyclomaticComplexity, 30),
			timeComplexity: payload.analysis.complexity.estimatedTimeComplexity,
			performanceScore: payload.analysis.complexity.performanceScore,
			riskLevel: payload.analysis.complexity.riskLevel,
			linesOfCode: payload.analysis.complexity.totalLines,
			methodCount: payload.analysis.complexity.methodCount,
		},
		issues: payload.optimization.issues.map((issue) => ({
			id: issue.id,
			type: issue.type,
			title: issue.title,
			line: issue.line,
			severity: issue.severity.toLowerCase() as IssueSeverity,
			explanation: issue.explanation,
			suggestion: issue.fixSuggestion || issue.suggestedFix,
			impact: issue.impact,
			ruleName: issue.ruleName,
			category: issue.category,
			fixSuggestion: issue.fixSuggestion || issue.suggestedFix,
		})),
	};
}

export async function analyzeJavaWorkspace(
	code: string,
	workspaceName: string,
	notifyOnCompletion = true
): Promise<WorkspaceReviewResult> {
	const queued = await queueJavaAnalysis(code, workspaceName, notifyOnCompletion);
	const maxAttempts = 50;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const status = await getJavaAnalysisJobStatus(queued.jobId);

		if (status.status === "COMPLETED" && status.result) {
			return mapFullReview(status.result);
		}

		if (status.status === "FAILED") {
			throw new Error(status.error || "Analysis job failed");
		}

		await sleep(300);
	}

	throw new Error("Analysis job timed out");
}
