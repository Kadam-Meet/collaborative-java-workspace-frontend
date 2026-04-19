import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useTheme } from "@/hooks/useTheme";
import type { WorkspaceIssue } from "@/api/analysisApi";
import { useEffect, useRef } from "react";

interface EditorPanelProps {
  code: string;
  fileName?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  issues?: WorkspaceIssue[];
  onSelectionChange?: (selection: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  }) => void;
  remoteSelections?: Array<{
    key: string;
    userLabel: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    colorIndex: number;
    typing: boolean;
  }>;
}

const markerSeverity = {
  high: 8,
  medium: 4,
  low: 2,
} as const;

const EditorPanel = ({
  code,
  fileName = "DataProcessor.java",
  onChange,
  readOnly = false,
  issues = [],
  onSelectionChange,
  remoteSelections = [],
}: EditorPanelProps) => {
  const { theme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }

    const model = editorRef.current.getModel();
    if (!model) {
      return;
    }

    const markers = issues.map((issue) => ({
      severity: markerSeverity[issue.severity],
      startLineNumber: Math.max(issue.line, 1),
      startColumn: 1,
      endLineNumber: Math.max(issue.line, 1),
      endColumn: model.getLineMaxColumn(Math.max(issue.line, 1)),
      message: `${issue.title}: ${issue.explanation}\nFix: ${issue.suggestion}`,
      source: "code-optimization",
    }));

    monacoRef.current.editor.setModelMarkers(model, "java-workspace-issues", markers);
  }, [issues]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }

    const monaco = monacoRef.current;
    const nextDecorations = remoteSelections.map((entry) => {
      const startLine = Math.max(entry.startLine, 1);
      const endLine = Math.max(entry.endLine, startLine);
      const startColumn = Math.max(entry.startColumn, 1);
      const endColumn = Math.max(entry.endColumn, startColumn + (startLine === endLine ? 0 : 1));

      return {
        range: new monaco.Range(startLine, startColumn, endLine, endColumn),
        options: {
          className: `remote-selection remote-selection-${entry.colorIndex}`,
          hoverMessage: { value: `${entry.userLabel}${entry.typing ? " (typing...)" : ""}` },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      };
    });

    decorationIdsRef.current = editorRef.current.deltaDecorations(decorationIdsRef.current, nextDecorations);
  }, [remoteSelections]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorSelection((event) => {
      onSelectionChange?.({
        startLine: event.selection.startLineNumber,
        startColumn: event.selection.startColumn,
        endLine: event.selection.endLineNumber,
        endColumn: event.selection.endColumn,
      });
    });
  };

  return (
    <div className="flex-1 workspace-panel overflow-hidden flex flex-col">
      <div className="h-8 border-b border-border flex items-center px-3 gap-2 shrink-0 relative">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
        </div>
        <span className="text-xs text-muted-foreground font-mono ml-2">{fileName}</span>
        <span className="absolute left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground bg-surface border border-border rounded px-2 py-0.5 max-w-[52%] truncate">
          Active file: <span className="text-foreground">{fileName}</span>
        </span>
        {remoteSelections.length > 0 && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {remoteSelections.filter((entry) => entry.typing).slice(0, 2).map((entry) => entry.userLabel).join(", ")}
            {remoteSelections.some((entry) => entry.typing) ? " typing..." : " editing"}
          </span>
        )}
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language="java"
          theme={theme === "dark" ? "vs-dark" : "light"}
          value={code}
          onChange={(value) => onChange(value || "")}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: true, scale: 1 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 12 },
            lineHeight: 20,
            renderLineHighlight: "all",
            bracketPairColorization: { enabled: true },
            glyphMargin: true,
          }}
        />
      </div>
    </div>
  );
};

export default EditorPanel;
