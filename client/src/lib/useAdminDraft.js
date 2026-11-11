import { useEffect, useState } from "react";

export default function useAdminDraft(storageKey, initialDraft) {
  const [savedState] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (value?.draft && typeof value.draft === "object") {
        return { draft: { ...initialDraft, ...value.draft }, editingId: value.editingId || null };
      }
    } catch {
      // Ignore invalid or unavailable browser storage and start with an empty draft.
    }
    return { draft: initialDraft, editingId: null };
  });
  const [draft, setDraft] = useState(savedState.draft);
  const [editingId, setEditingId] = useState(savedState.editingId);

  useEffect(() => {
    try {
      if (!editingId && JSON.stringify(draft) === JSON.stringify(initialDraft)) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify({ draft, editingId }));
      }
    } catch {
      // Draft persistence is best-effort if browser storage is unavailable.
    }
  }, [draft, editingId, initialDraft, storageKey]);

  return [draft, setDraft, editingId, setEditingId];
}
