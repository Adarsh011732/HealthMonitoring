import { headers } from "next/headers";
import { authReady, getAuth } from "./auth";

export interface AppUserSession {
  session: {
    id: string;
    userId: string;
    expiresAt: Date | string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };
}

export async function session(): Promise<AppUserSession | null> {
  try {
    const cookieHeader = (await headers()).get("cookie") || "";
    // If no auth cookie exists, skip remote database lookup entirely (instant response)
    if (!cookieHeader.includes("better-auth") && !cookieHeader.includes("branchline_session")) {
      return null;
    }

    if (authReady()) {
      const s = await getAuth().api.getSession({ headers: await headers() });
      if (s) return s as unknown as AppUserSession;
    }
  } catch {}

  return null;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get("host") || new URL(request.url).host;
    if (originHost === requestHost) return true;
    const originName = originHost.split(":")[0];
    const requestName = requestHost.split(":")[0];
    if (
      (originName === "localhost" || originName === "127.0.0.1" || originName === "0.0.0.0") &&
      (requestName === "localhost" || requestName === "127.0.0.1" || requestName === "0.0.0.0")
    ) {
      return true;
    }
  } catch {}
  if (process.env.BETTER_AUTH_URL) {
    try {
      if (new URL(origin).host === new URL(process.env.BETTER_AUTH_URL).host) return true;
    } catch {}
  }
  return false;
}
