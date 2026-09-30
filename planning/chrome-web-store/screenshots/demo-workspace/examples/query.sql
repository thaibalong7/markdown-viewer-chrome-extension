SELECT
  document_type,
  COUNT(*) AS files,
  ROUND(AVG(render_time_ms), 1) AS average_render_ms
FROM workspace_documents
WHERE opened_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY document_type
ORDER BY files DESC;

