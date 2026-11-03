"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import type { FeedPost } from "@/lib/feedStore";

type Props = {
  post: FeedPost;
  onLike: (id: string) => void;
  onComment: (id: string, text: string) => void;
  onRepost: (id: string) => void;
  onBookmark: (id: string) => void;
};

export function PostCard({ post, onLike, onComment, onRepost, onBookmark }: Props) {
  const t = useT();
  const [openComments, setOpenComments] = useState(false);
  const [text, setText] = useState("");

  async function reportPost() {
    const reason = window.prompt("Почему вы жалуетесь на эту публикацию?");
    if (reason === null) return;
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "post", targetId: post.id, reason }),
      });
      if (response.ok) {
        window.alert("Жалоба отправлена модератору");
        return;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(
        data.error === "already_reported"
          ? "Вы уже отправили жалобу на эту публикацию"
          : "Не удалось отправить жалобу",
      );
    } catch {
      window.alert("Не удалось отправить жалобу");
    }
  }

  return (
    <article className="vk-post">
      <div className="vk-avatar sm">{post.author.avatar}</div>
      <div className="vk-post-body">
        <a href="#" className="vk-post-author">
          {post.author.name}
        </a>
        <div className="vk-post-date">{post.createdAt}</div>
        <div className="vk-post-text">{post.text}</div>

        {post.image ? (
          <div
            className="vk-post-media"
            style={{ backgroundImage: `url(${post.image})` }}
            role="img"
            aria-label={t("composer.photo")}
          />
        ) : null}

        {post.video ? (
          <video className="vk-post-video" src={post.video} controls playsInline />
        ) : null}

        {post.attachment ? (
          <div className="vk-file">
            <div className="vk-file-icon">ZIP</div>
            <div className="vk-file-meta">
              <strong>{post.attachment.name}</strong>
              <div>
                <span>{post.attachment.size}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="vk-post-actions">
          <button
            type="button"
            className={post.likedByMe ? "is-on" : undefined}
            onClick={() => onLike(post.id)}
          >
            {t("post.like")} {post.likes}
          </button>
          <button type="button" onClick={() => setOpenComments((v) => !v)}>
            {t("post.comment")} {post.comments}
          </button>
          <button type="button" onClick={() => onRepost(post.id)}>
            {t("post.share")} {post.reposts}
          </button>
          <button
            type="button"
            className={post.bookmarked ? "is-on" : undefined}
            onClick={() => onBookmark(post.id)}
          >
            {post.bookmarked ? t("post.saved") : t("post.save")}
          </button>
          <button type="button" onClick={() => void reportPost()}>
            Пожаловаться
          </button>
          {post.status === "pending" ? (
            <span className="vk-badge" style={{ alignSelf: "center" }}>
              На модерации
            </span>
          ) : null}
        </div>

        {openComments ? (
          <div className="vk-comments">
            {(post.commentList ?? []).map((c) => (
              <div key={c.id} className="vk-comment">
                <div className="vk-avatar xs">{c.author.avatar}</div>
                <div>
                  <strong>{c.author.name}</strong>
                  <div className="vk-post-date">{c.createdAt}</div>
                  <div>{c.text}</div>
                </div>
              </div>
            ))}
            {post.commentsEnabled === false ? (
              <div className="vk-post-date">Комментарии к этой записи отключены</div>
            ) : (
            <form
              className="vk-comment-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                onComment(post.id, text);
                setText("");
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("post.commentPlaceholder")}
              />
              <button type="submit" className="vk-btn" disabled={!text.trim()}>
                {t("post.send")}
              </button>
            </form>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
