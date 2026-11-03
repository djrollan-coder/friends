import { getDb, uid, type Row } from "./db";
import { findUserById } from "./auth";
import { formatWhen, userDTO, type UserDTO } from "./shared";

export type ListingDTO = {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  createdAt: string;
  createdAtLabel: string;
  seller: UserDTO | null;
};

export function listListings(): ListingDTO[] {
  const rows = getDb()
    .prepare("SELECT * FROM listings ORDER BY created_at DESC LIMIT 100")
    .all() as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    price: Number(row.price ?? 0),
    imageUrl: (row.image_url as string) ?? undefined,
    createdAt: new Date(Number(row.created_at)).toISOString(),
    createdAtLabel: formatWhen(Number(row.created_at)),
    seller: userDTO(findUserById(String(row.user_id))),
  }));
}

export function createListing(
  meId: string,
  input: { title?: string; description?: string; price?: number; imageUrl?: string },
) {
  const title = input.title?.trim();
  if (!title) throw new Error("missing_title");
  getDb()
    .prepare(
      "INSERT INTO listings (id, user_id, title, description, price, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      uid("lst"),
      meId,
      title,
      input.description?.trim() || "",
      Math.max(0, Math.round(Number(input.price ?? 0))),
      input.imageUrl ?? null,
      Date.now(),
    );
  return listListings();
}

export function deleteListing(meId: string, id: string) {
  getDb().prepare("DELETE FROM listings WHERE id = ? AND user_id = ?").run(id, meId);
  return listListings();
}
