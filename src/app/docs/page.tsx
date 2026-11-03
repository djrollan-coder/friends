"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, uploadFile } from "@/lib/api";
import { useT } from "@/lib/i18n/I18nProvider";

type Doc = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  createdAtLabel: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function DocsPage() {
  const t = useT();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ documents: Doc[] }>("/api/documents");
      setDocs(data.documents);
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
    setError("");
    try {
      const stored = await uploadFile(file);
      const data = await api<{ documents: Doc[] }>("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          type: file.type,
          url: stored.url,
        }),
      });
      setDocs(data.documents);
    } catch {
      setError("Не удалось загрузить файл (максимум 25 МБ)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vk-main-pad">
      <div className="messages-head">
        <h1 className="vk-page-title">{t("stub.docsTitle")}</h1>
        <button
          type="button"
          className="vk-btn"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? t("common.loading") : "Загрузить файл"}
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error ? <div className="profile-editor-error">{error}</div> : null}

      <div className="vk-list">
        {docs.length ? (
          docs.map((doc) => (
            <div key={doc.id} className="vk-list-row">
              <div className="vk-avatar sm">{(doc.name[0] ?? "Ф").toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <a href={doc.url} download={doc.name} target="_blank" rel="noreferrer">
                  {doc.name}
                </a>
                <div style={{ color: "var(--vk-muted)", marginTop: 2 }}>
                  {formatSize(doc.size)} · {doc.createdAtLabel}
                </div>
              </div>
              <div className="vk-list-meta friends-actions">
                <a href={doc.url} download={doc.name} className="vk-btn">
                  Скачать
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Удалить файл?")) return;
                    const data = await api<{ documents: Doc[] }>(`/api/documents/${doc.id}`, {
                      method: "DELETE",
                    });
                    setDocs(data.documents);
                  }}
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="vk-empty">Файлов пока нет</div>
        )}
      </div>
    </div>
  );
}
