await fetch("/api/threads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title, body, tags: tags.split(",").map(t=>t.trim()).filter(Boolean) })
});
