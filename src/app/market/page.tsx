"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, uploadFile } from "@/lib/api";
import { useT } from "@/lib/i18n/I18nProvider";
import type { UserDTO } from "@/lib/dto";

type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  createdAt: string;
  createdAtLabel: string;
  seller: UserDTO | null;
};

export default function MarketPage() {
  const t = useT();
  const [listings, setListings] = useState<Listing[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ listings: Listing[] }>("/api/listings");
      setListings(data.listings);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const stored = await uploadFile(file);
      setImageUrl(stored.url);
    } catch {
      setError("Не удалось загрузить изображение");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ listings: Listing[] }>("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          price: Number(price) || 0,
          imageUrl,
        }),
      });
      setListings(data.listings);
      setOpen(false);
      setTitle("");
      setDescription("");
      setPrice("");
      setImageUrl(undefined);
    } catch {
      setError("Не удалось опубликовать объявление");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vk-main-pad">
      <div className="messages-head">
        <h1 className="vk-page-title">{t("stub.marketTitle")}</h1>
        <button type="button" className="vk-btn" onClick={() => setOpen((v) => !v)}>
          {open ? t("common.close") : "Разместить объявление"}
        </button>
      </div>

      {open ? (
        <div className="vk-card vk-main-pad" style={{ marginBottom: 14 }}>
          <label className="auth-field">
            <span>Название</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>Описание</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>
          <label className="auth-field">
            <span>Цена, ₽</span>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <button
              type="button"
              className="vk-btn ghost"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {imageUrl ? "Фото добавлено" : "Добавить фото"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="vk-btn"
              disabled={busy || !title.trim()}
              onClick={() => void submit()}
            >
              Опубликовать
            </button>
          </div>
          {error ? <div className="profile-editor-error">{error}</div> : null}
        </div>
      ) : null}

      {listings.length ? (
        <div className="apps-grid">
          {listings.map((listing) => (
            <article key={listing.id} className="vk-card market-card">
              {listing.imageUrl ? (
                <div
                  className="market-card-image"
                  style={{ backgroundImage: `url(${listing.imageUrl})` }}
                />
              ) : null}
              <div className="market-card-body">
                <strong>{listing.title}</strong>
                <div style={{ color: "var(--vk-muted)", marginTop: 4 }}>
                  {listing.description}
                </div>
                <div className="market-card-price">
                  {listing.price > 0 ? `${listing.price.toLocaleString("ru-RU")} ₽` : "Договорная"}
                </div>
                <div style={{ color: "var(--vk-muted)", fontSize: 12, marginTop: 6 }}>
                  {listing.seller?.name} · {listing.createdAtLabel}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="vk-empty">{t("stub.marketEmpty")}</div>
      )}
    </div>
  );
}
