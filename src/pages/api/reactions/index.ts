import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";

const REACTIONS_FILE = path.join(process.cwd(), "data", "reactions.json");
const ALLOWED_REACTIONS = ["like", "love", "fire", "mind", "hacker"];

// IP-based rate limiting for reactions
const reactionRateLimit = new Map<
    string,
    { count: number; resetTime: number }
>();
const MAX_REACTIONS_PER_MINUTE = 10;

function getClientIP(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const real = request.headers.get("x-real-ip");
    return forwarded?.split(",")[0].trim() || real || "unknown";
}

function checkReactionRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = reactionRateLimit.get(ip);

    if (!record || now > record.resetTime) {
        reactionRateLimit.set(ip, { count: 1, resetTime: now + 60000 });
        return true;
    }

    if (record.count >= MAX_REACTIONS_PER_MINUTE) {
        return false;
    }

    record.count++;
    return true;
}

function sanitizeInput(input: string): string {
    return input.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 100);
}

// Ensure data directory exists
async function ensureDataDir() {
    const dataDir = path.join(process.cwd(), "data");
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

// Load reactions from file
async function loadReactions(): Promise<
    Record<string, Record<string, number>>
> {
    await ensureDataDir();
    try {
        const data = await fs.readFile(REACTIONS_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Save reactions to file
async function saveReactions(
    reactions: Record<string, Record<string, number>>
) {
    await ensureDataDir();
    await fs.writeFile(REACTIONS_FILE, JSON.stringify(reactions, null, 2));
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const ip = getClientIP(request);

        // Rate limiting
        if (!checkReactionRateLimit(ip)) {
            return new Response(
                JSON.stringify({
                    error: "Too many reactions. Please slow down.",
                }),
                { status: 429, headers: { "Content-Type": "application/json" } }
            );
        }

        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > 1024) {
            return new Response(
                JSON.stringify({ error: "Request too large" }),
                { status: 413, headers: { "Content-Type": "application/json" } }
            );
        }

        const { postId, reaction } = await request.json();

        if (!postId || !reaction) {
            return new Response(
                JSON.stringify({ error: "Missing postId or reaction" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Validate reaction type
        if (!ALLOWED_REACTIONS.includes(reaction)) {
            return new Response(
                JSON.stringify({ error: "Invalid reaction type" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Sanitize inputs
        const cleanPostId = sanitizeInput(postId);
        const cleanReaction = sanitizeInput(reaction);

        const reactions = await loadReactions();

        if (!reactions[cleanPostId]) {
            reactions[cleanPostId] = {};
        }

        if (!reactions[cleanPostId][cleanReaction]) {
            reactions[cleanPostId][cleanReaction] = 0;
        }

        reactions[cleanPostId][cleanReaction]++;

        await saveReactions(reactions);

        return new Response(
            JSON.stringify({
                success: true,
                count: reactions[cleanPostId][cleanReaction],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to save reaction" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};

export const GET: APIRoute = async ({ url }) => {
    try {
        const postId = url.searchParams.get("postId");

        if (!postId) {
            return new Response(JSON.stringify({ error: "Missing postId" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const cleanPostId = sanitizeInput(postId);
        const reactions = await loadReactions();
        const postReactions = reactions[cleanPostId] || {
            like: 0,
            love: 0,
            fire: 0,
            mind: 0,
            hacker: 0,
        };

        return new Response(JSON.stringify(postReactions), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to load reactions" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
