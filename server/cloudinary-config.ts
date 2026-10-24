export interface CloudinaryCredentials {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

export function cloudinaryCredentials(env: Record<string, string | undefined> = process.env): CloudinaryCredentials | null {
  let cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  let apiKey = env.CLOUDINARY_API_KEY?.trim() ?? "";
  let apiSecret = env.CLOUDINARY_API_SECRET?.trim() ?? "";
  const cloudinaryUrl = env.CLOUDINARY_URL?.trim();

  if ((!apiKey || !apiSecret || !cloudName) && cloudinaryUrl) {
    try {
      const url = new URL(cloudinaryUrl);
      if (url.protocol !== "cloudinary:" || !url.hostname) return null;
      if (cloudName && cloudName !== url.hostname) return null;
      cloudName ||= url.hostname;
      apiKey ||= decodeURIComponent(url.username);
      apiSecret ||= decodeURIComponent(url.password);
    } catch {
      return null;
    }
  }

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret };
}