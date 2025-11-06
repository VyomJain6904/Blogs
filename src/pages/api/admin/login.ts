import type { APIRoute } from "astro";
import WriteupsConfig from "../../../../geeklurk";
import {
    recordFailedAttempt,
    generateSessionToken,
    activeSessions,
} from "../../../middleware";
import crypto from "crypto";

// Get allowed admin username from config
const ADMIN_USERNAME = WriteupsConfig.adminUsername || "geeklurk";

function getClientIP(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const real = request.headers.get("x-real-ip");
    return forwarded?.split(",")[0].trim() || real || "unknown";
}

function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
}

function sanitizeInput(input: string): string {
    return input
        .replace(/[<>'"]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .trim();
}

function validateUsername(username: string): boolean {
    // Only alphanumeric and underscore, 3-20 characters
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validatePassword(password: string): boolean {
    // At least 8 characters
    return password.length >= 8 && password.length <= 128;
}

export const POST: APIRoute = async ({ request, cookies }) => {
    const ip = getClientIP(request);

    try {
        // Parse request body with size limit
        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > 1024) {
            return new Response(
                JSON.stringify({ error: "Request too large" }),
                { status: 413, headers: { "Content-Type": "application/json" } }
            );
        }

        const body = await request.json();
        const { username, password } = body;

        // Input validation
        if (!username || !password) {
            recordFailedAttempt(ip);
            return new Response(
                JSON.stringify({ error: "Username and password required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Sanitize inputs
        const cleanUsername = sanitizeInput(username);
        const cleanPassword = password; // Don't sanitize password

        // Validate format
        if (!validateUsername(cleanUsername)) {
            recordFailedAttempt(ip);
            return new Response(
                JSON.stringify({ error: "Invalid username format" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!validatePassword(cleanPassword)) {
            recordFailedAttempt(ip);
            return new Response(
                JSON.stringify({ error: "Invalid password format" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Timing-safe comparison to prevent timing attacks
        const expectedUsername = ADMIN_USERNAME;
        const expectedPassword = WriteupsConfig.adminPassword || "";

        // Use constant-time comparison
        const usernameMatch =
            crypto.timingSafeEqual(
                Buffer.from(cleanUsername),
                Buffer.from(expectedUsername.padEnd(cleanUsername.length))
            ) && cleanUsername.length === expectedUsername.length;

        const passwordMatch =
            crypto.timingSafeEqual(
                Buffer.from(cleanPassword),
                Buffer.from(expectedPassword.padEnd(cleanPassword.length))
            ) && cleanPassword.length === expectedPassword.length;

        if (!usernameMatch || !passwordMatch) {
            recordFailedAttempt(ip);

            // Add delay to prevent brute force
            await new Promise((resolve) => setTimeout(resolve, 1000));

            return new Response(
                JSON.stringify({ error: "Invalid credentials" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        // Generate secure session token
        const sessionToken = generateSessionToken();
        const sessionExpiry = Date.now() + 3600000; // 1 hour

        // Store session
        activeSessions.set(sessionToken, {
            username: cleanUsername,
            expires: sessionExpiry,
        });

        // Set secure cookie
        cookies.set("admin_session", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 3600, // 1 hour
            path: "/",
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: "Authentication successful",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Login error:", error);
        recordFailedAttempt(ip);

        return new Response(
            JSON.stringify({ error: "Authentication failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
