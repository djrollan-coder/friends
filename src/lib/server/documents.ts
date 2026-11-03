import { getDb, uid, type Row } from "./db";
import { formatWhen } from "./shared";

export type DocumentDTO = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
  createdAtLabel: string;
};

export function listDocuments(meId: string): DocumentDTO[] {
  const rows = getDb()
    .prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC")
    .all(meId) as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    size: Number(row.size ?? 0),
    type: String(row.type ?? ""),
    url: String(row.url),
    createdAt: new Date(Number(row.created_at)).toISOString(),
    createdAtLabel: formatWhen(Number(row.created_at)),
  }));
}

export function addDocument(
  meId: string,
  input: { name?: string; size?: number; type?: string; url: string },
) {
  getDb()
    .prepare(
      "INSERT INTO documents (id, user_id, name, size, type, url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      uid("doc"),
      meId,
      input.name?.trim() || "Файл",
      Math.max(0, Number(input.size ?? 0)),
      input.type ?? "",
      input.url,
      Date.now(),
    );
  return listDocuments(meId);
}

export function deleteDocument(meId: string, id: string) {
  getDb().prepare("DELETE FROM documents WHERE id = ? AND user_id = ?").run(id, meId);
  return listDocuments(meId);
}
