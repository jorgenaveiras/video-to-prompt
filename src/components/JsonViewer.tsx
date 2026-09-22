"use client";

import { useState } from "react";

interface JsonViewerProps {
  data: unknown;
  title?: string;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JsonNode {
  key?: string;
  value: JsonValue;
  level: number;
  path: string;
}

function JsonNodeComponent({
  node,
  expandedPaths,
  onToggle,
}: {
  node: JsonNode;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}) {
  const { key, value, level, path } = node;
  const isExpanded = expandedPaths.has(path);
  const hasChildren = value !== null && typeof value === "object" && Object.keys(value as object).length > 0;
  const isArray = Array.isArray(value);
  const entries = hasChildren ? Object.entries(value as object) : [];

  const getTypeColor = (val: JsonValue) => {
    if (val === null) return "text-purple-400";
    if (typeof val === "string") return "text-green-400";
    if (typeof val === "number") return "text-blue-400";
    if (typeof val === "boolean") return "text-orange-400";
    return "text-gray-500";
  };

  const formatValue = (val: JsonValue) => {
    if (val === null) return "null";
    if (typeof val === "string") return `"${val}"`;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (isArray) return `[${(val as JsonValue[]).length}]`;
    return `{${Object.keys(val as object).length}}`;
  };

  return (
    <div className="font-mono text-sm text-gray-200">
      <div className="flex items-start gap-2" style={{ paddingLeft: `${level * 1.5}rem` }}>
        {hasChildren ? (
          <button
            onClick={() => onToggle(path)}
            className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-200 rounded transition-colors mt-0.5 flex-shrink-0"
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        ) : (
          <span className="w-5 h-5 flex-shrink-0" />
        )}
        {key && <span className="text-gray-400 flex-shrink-0">"{key}":</span>}
        <span className={getTypeColor(value)}>{formatValue(value)}</span>
        {hasChildren && !isExpanded && (
          <span className="text-gray-500 ml-1">
            {isArray ? `... (${entries.length} items)` : `... (${entries.length} keys)`}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="border-l-2 border-gray-700 ml-5">
          {entries.map(([k, v]) => (
            <JsonNodeComponent
              key={`${path}.${k}`}
              node={{ key: k, value: v, level: level + 1, path: `${path}.${k}` }}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function JsonViewer({ data, title = "JSON Completo" }: JsonViewerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(["root"])
  );

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandAll = () => {
    const paths = new Set<string>(["root"]);
    const collectPaths = (obj: JsonValue, prefix = "root") => {
      if (obj !== null && typeof obj === "object") {
        Object.keys(obj as object).forEach((k) => {
          const newPath = `${prefix}.${k}`;
          paths.add(newPath);
          collectPaths((obj as Record<string, JsonValue>)[k], newPath);
        });
      }
    };
    collectPaths(data as JsonValue);
    setExpandedPaths(paths);
  };

  const collapseAll = () => {
    setExpandedPaths(new Set(["root"]));
  };

  return (
    <div className="p-5 bg-gray-900 dark:bg-gray-950 rounded-xl border border-gray-700 overflow-x-auto">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
        <h3 className="font-semibold text-gray-100">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded transition-colors"
          >
            Expandir todo
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded transition-colors"
          >
            Colapsar todo
          </button>
        </div>
      </div>
      <JsonNodeComponent
        node={{ value: data as JsonValue, level: 0, path: "root" }}
        expandedPaths={expandedPaths}
        onToggle={togglePath}
      />
    </div>
  );
}