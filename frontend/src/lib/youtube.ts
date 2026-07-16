export function isYoutubeUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)youtube\.com$/.test(hostname) || /(^|\.)youtu\.be$/.test(hostname);
  } catch {
    return false;
  }
}

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (/youtu\.be$/.test(u.hostname)) {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (u.pathname.startsWith("/embed/")) {
      return u.pathname.split("/embed/")[1]?.split("/")[0] || null;
    }
    if (u.pathname === "/watch") {
      return u.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

export function toYoutubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
