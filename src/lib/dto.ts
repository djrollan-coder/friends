export type UserDTO = {
  id: string;
  name: string;
  avatar: string;
  photo?: string;
  cover?: string;
  status?: string;
  online: boolean;
  city?: string;
  bio?: string;
};

export type FeedComment = {
  id: string;
  author: UserDTO;
  text: string;
  createdAt: string;
  createdAtIso?: string;
};

export type FeedPost = {
  id: string;
  author: UserDTO;
  text: string;
  createdAt: string;
  createdAtIso?: string;
  likes: number;
  comments: number;
  reposts: number;
  likedByMe?: boolean;
  bookmarked?: boolean;
  image?: string;
  video?: string;
  attachment?: { name: string; size: string; type: "file" | "photo" };
  commentList?: FeedComment[];
  groupId?: string;
  status?: "published" | "pending";
  commentsEnabled?: boolean;
};

export type Person = UserDTO & {
  relation?: "friend" | "incoming" | "outgoing" | "following" | "none";
};

export type FriendsState = {
  friendIds: string[];
  incoming: string[];
  outgoing: string[];
  following: string[];
};

export type Community = {
  id: string;
  name: string;
  desc: string;
  privacy: "public" | "private";
  ownerId: string;
  memberIds: string[];
  cover: string;
  createdAt?: number;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  createdAtIso?: string;
  silent?: boolean;
};

export type ChatThread = {
  id: string;
  type: "dm" | "group";
  title: string;
  memberIds: string[];
  messages: ChatMessage[];
  unread: number;
  peer?: UserDTO | null;
  members?: UserDTO[];
};

export type NotificationItem = {
  id: string;
  type: "message" | "like" | "comment" | "friend" | "repost" | "group";
  title: string;
  body: string;
  href: string;
  createdAt: string;
  createdAtIso?: string;
  read: boolean;
};

export type ProfileDTO = UserDTO & {
  username?: string;
  birthday?: string;
  relationship?: string;
  counts: {
    friends: number;
    groups: number;
    photos: number;
    videos: number;
    posts: number;
  };
};
