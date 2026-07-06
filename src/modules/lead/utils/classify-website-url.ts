export type ClassifiedLinks = {
  website: string | null;
  instagram: string | null;
  facebook: string | null;
};

function isInstagramHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, '');
  return (
    normalized === 'instagram.com' || normalized.endsWith('.instagram.com')
  );
}

function isFacebookHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, '');
  return (
    normalized === 'facebook.com' ||
    normalized.endsWith('.facebook.com') ||
    normalized === 'fb.com' ||
    normalized === 'fb.me'
  );
}

function classifyByString(raw: string): ClassifiedLinks {
  const lower = raw.toLowerCase();
  if (lower.includes('instagram.com')) {
    return { instagram: raw, website: null, facebook: null };
  }
  if (
    lower.includes('facebook.com') ||
    lower.includes('fb.com') ||
    lower.includes('fb.me')
  ) {
    return { facebook: raw, website: null, instagram: null };
  }
  return { website: raw, instagram: null, facebook: null };
}

export function classifyWebsiteUrl(raw?: string | null): ClassifiedLinks {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { website: null, instagram: null, facebook: null };
  }

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    const host = parsed.hostname;

    if (isInstagramHost(host)) {
      return { instagram: trimmed, website: null, facebook: null };
    }
    if (isFacebookHost(host)) {
      return { facebook: trimmed, website: null, instagram: null };
    }
    return { website: trimmed, instagram: null, facebook: null };
  } catch {
    return classifyByString(trimmed);
  }
}
