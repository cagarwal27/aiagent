const FEATURE_LABELS = {
  "real-time-query": "Real-time Query",
  "durable-workflow": "Durable Workflow",
  "delta-streaming": "Delta Streaming",
  "file-storage": "File Storage",
  "acid-mutation": "ACID Mutation",
  "scheduled-functions": "Scheduled Functions",
  "vector-search": "Vector Search",
  "http-actions": "HTTP Actions",
  agent: "@convex-dev/agent",
};

export default function ConvexBadge({ feature, size = "sm" }) {
  const label = FEATURE_LABELS[feature] ?? feature;
  return (
    <span className={`convex-badge convex-badge--${size}`}>
      {label}
    </span>
  );
}
