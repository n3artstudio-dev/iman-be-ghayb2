export type ResolvedVideo = { type: "file" | "iframe"; src: string; provider: string };

/** Turns a user-provided link (mp4, YouTube, Aparat, Instagram reel) into something playable. */
export function resolveVideo(url: string): ResolvedVideo {
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}`, provider: "YouTube" };

  const aparat = u.match(/aparat\.com\/v\/([\w-]+)/i);
  if (aparat) {
    return {
      type: "iframe",
      src: `https://www.aparat.com/video/video/embed/videohash/${aparat[1]}/vt/frame`,
      provider: "آپارات",
    };
  }

  const ig = u.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/i);
  if (ig) {
    const kind = ig[1].toLowerCase() === "reels" ? "reel" : ig[1].toLowerCase();
    return { type: "iframe", src: `https://www.instagram.com/${kind}/${ig[2]}/embed`, provider: "Instagram" };
  }

  return { type: "file", src: u, provider: "file" };
}
