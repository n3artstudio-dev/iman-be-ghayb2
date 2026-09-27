import type { ConscienceResult } from "./conscience";

export interface Me {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  isGuest: boolean;
  isAdmin: boolean;
  bio: string;
  avatarColor: string;
  restrainedCount: number;
  kindCount: number;
  slipCount: number;
  createdAt: string;
}

export interface MemberInfo {
  id: number;
  name: string;
  phone: string;
  avatarColor: string;
  lastSeenAt: string;
  isBot: boolean;
  bio: string;
  lastReadAt?: string;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  kind: string;
  body: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  pending?: boolean;
}

export interface ConversationSummary {
  id: number;
  isGroup: boolean;
  title: string | null;
  updatedAt: string;
  unread: number;
  lastMessage: { id: number; body: string; kind: string; senderId: number; createdAt: string } | null;
  members: MemberInfo[];
}

export interface ConversationDetail {
  id: number;
  isGroup: boolean;
  title: string | null;
  members: MemberInfo[];
}

export interface StatusItem {
  id: number;
  kind: "text" | "image" | "verse";
  text: string;
  bg: string;
  imageData: string | null;
  verseId: string | null;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
  viewCount?: number;
}

export interface StatusGroup {
  user: { id: number; name: string; avatarColor: string; isBot: boolean };
  items: StatusItem[];
  allViewed: boolean;
  latestAt: string;
}

export interface ContactItem {
  id: number;
  name: string;
  phone: string;
  user: { id: number; name: string; bio: string; avatarColor: string; lastSeenAt: string } | null;
}

export interface VideoItem {
  id: number;
  title: string;
  description: string;
  category: string;
  url: string;
  poster: string | null;
  verseArabic: string | null;
  verseTranslation: string | null;
  verseRef: string | null;
  views: number;
  featured: boolean;
  createdAt: string;
  authorName: string | null;
  authorId: number | null;
  likes: number;
  comments: number;
}

export interface VideoComment {
  id: number;
  body: string;
  createdAt: string;
  userId: number;
  userName: string;
  avatarColor: string;
}

export interface JourneyChapterItem {
  id?: number;
  slug: string;
  sortOrder: number;
  kicker: string;
  title: string;
  image: string;
  verseIds: string[];
  poem: string[];
  narration: string;
  scene: string;
}

export type WithReflection<T> = T & { reflect?: ConscienceResult; care?: ConscienceResult | null };
