import { defineMiddleware } from "astro:middleware";
import WriteupsConfig from "../geeklurk";

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS = 50; // Increased for better UX
const WINDOW_MS = 300000; // 5 minutes instead of 1 minute

// Failed login attempts tracking
const failedAttempts = new Map<
    string,
    { count: number; blockedUntil: number }
>();
const MAX_FAILED_ATTEMPTS = 5; // Increased from 3
const BLOCK_DURATION = 600000; // 10 minutes instead of 15

// Active sessions
const activeSessions = new Map<string, { username: string; expires: number }>();

function getClientIP(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const real = request.headers.get("x-real-ip");
    return forwarded?.split(",")[0].trim() || real || "unknown";
}

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
        return true;
    }

    if (record.count >= MAX_REQUESTS) {
        return false;
    }

    record.count++;
    return true;
}

function checkFailedAttempts(ip: string): {
    allowed: boolean;
    blockedUntil?: number;
} {
    const now = Date.now();
    const record = failedAttempts.get(ip);

    if (!record) {
        return { allowed: true };
    }

    if (now < record.blockedUntil) {
        return { allowed: false, blockedUntil: record.blockedUntil };
    }

    if (now > record.blockedUntil) {
        failedAttempts.delete(ip);
        return { allowed: true };
    }

    return { allowed: true };
}

function recordFailedAttempt(ip: string) {
    const now = Date.now();
    const record = failedAttempts.get(ip);

    if (!record) {
        failedAttempts.set(ip, { count: 1, blockedUntil: 0 });
        return;
    }

    record.count++;

    if (record.count >= MAX_FAILED_ATTEMPTS) {
        record.blockedUntil = now + BLOCK_DURATION;
    }
}

function generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
        ""
    );
}

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, url, cookies, redirect } = context;
    const pathname = url.pathname;

    // Admin routes protection
    if (pathname.startsWith("/admin")) {
        const ip = getClientIP(request);

        // Check rate limiting
        if (!checkRateLimit(ip)) {
            return new Response(
                JSON.stringify({
                    error: "Too many requests. Please try again after 5 minutes.",
                }),
                {
                    status: 429,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Check if IP is temporarily blocked
        const attemptCheck = checkFailedAttempts(ip);
        if (!attemptCheck.allowed) {
            const minutesLeft = Math.ceil(
                (attemptCheck.blockedUntil! - Date.now()) / 60000
            );
            return new Response(
                JSON.stringify({
                    error: `Too many failed attempts. Blocked for ${minutesLeft} minutes.`,
                }),
                {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Check session for admin pages
        if (pathname !== "/admin/login") {
            const sessionToken = cookies.get("admin_session")?.value;

            if (!sessionToken) {
                return redirect("/admin/login");
            }

            const session = activeSessions.get(sessionToken);

            if (!session || Date.now() > session.expires) {
                activeSessions.delete(sessionToken);
                cookies.delete("admin_session");
                return redirect("/admin/login");
            }

            // Extend session
            session.expires = Date.now() + 3600000; // 1 hour
        }
    }

    // API routes security
    if (pathname.startsWith("/api/")) {
        const ip = getClientIP(request);

        // Rate limiting for API
        if (!checkRateLimit(ip)) {
            return new Response(
                JSON.stringify({ error: "Rate limit exceeded" }),
                {
                    status: 429,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // CSRF protection for state-changing requests
        if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
            const origin = request.headers.get("origin");
            const referer = request.headers.get("referer");
            const allowedOrigin = new URL(WriteupsConfig.site).origin;

            if (
                origin &&
                !origin.startsWith(allowedOrigin) &&
                !origin.startsWith("http://localhost")
            ) {
                return new Response(
                    JSON.stringify({ error: "CSRF validation failed" }),
                    {
                        status: 403,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            if (
                referer &&
                !referer.startsWith(allowedOrigin) &&
                !referer.startsWith("http://localhost")
            ) {
                return new Response(
                    JSON.stringify({ error: "CSRF validation failed" }),
                    {
                        status: 403,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }
        }
    }

    const response = await next();

    // Security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://fastly.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.bunny.net https://fastly.jsdelivr.net; font-src 'self' https://fonts.bunny.net; img-src 'self' data: https:; connect-src 'self';"
    );
    response.headers.set(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()"
    );

    return response;
});

export { recordFailedAttempt, generateSessionToken, activeSessions };
