import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";

const COMMENTS_FILE = path.join(process.cwd(), "data", "comments.json");
const MAX_COMMENT_LENGTH = 1000;
const MAX_USERNAME_LENGTH = 50;

// IP-based rate limiting
const commentRateLimit = new Map<
    string,
    { count: number; resetTime: number }
>();
const MAX_COMMENTS_PER_HOUR = 10;

interface Comment {
    id: string;
    postId: string;
    username: string;
    text: string;
    date: string;
}

function getClientIP(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const real = request.headers.get("x-real-ip");
    return forwarded?.split(",")[0].trim() || real || "unknown";
}

function checkCommentRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = commentRateLimit.get(ip);

    if (!record || now > record.resetTime) {
        commentRateLimit.set(ip, { count: 1, resetTime: now + 3600000 });
        return true;
    }

    if (record.count >= MAX_COMMENTS_PER_HOUR) {
        return false;
    }

    record.count++;
    return true;
}

function sanitizeString(input: string): string {
    return input
        .replace(/[<>'"]/g, (char) => {
            const entities: { [key: string]: string } = {
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;",
            };
            return entities[char] || char;
        })
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .trim();
}

function sanitizePostId(input: string): string {
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

// Load comments from file
async function loadComments(): Promise<Comment[]> {
    await ensureDataDir();
    try {
        const data = await fs.readFile(COMMENTS_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Save comments to file
async function saveComments(comments: Comment[]) {
    await ensureDataDir();
    await fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 2));
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const ip = getClientIP(request);

        // Rate limiting
        if (!checkCommentRateLimit(ip)) {
            return new Response(
                JSON.stringify({
                    error: "Too many comments. Please try again later.",
                }),
                { status: 429, headers: { "Content-Type": "application/json" } }
            );
        }

        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > 2048) {
            return new Response(
                JSON.stringify({ error: "Request too large" }),
                { status: 413, headers: { "Content-Type": "application/json" } }
            );
        }

        const { postId, username, text } = await request.json();

        if (!postId || !text) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Validate lengths
        if (text.length > MAX_COMMENT_LENGTH) {
            return new Response(
                JSON.stringify({
                    error: `Comment must be under ${MAX_COMMENT_LENGTH} characters`,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (username && username.length > MAX_USERNAME_LENGTH) {
            return new Response(
                JSON.stringify({
                    error: `Username must be under ${MAX_USERNAME_LENGTH} characters`,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Sanitize inputs
        const cleanPostId = sanitizePostId(postId);
        const cleanUsername = username
            ? sanitizeString(username).substring(0, MAX_USERNAME_LENGTH)
            : "Anonymous";
        const cleanText = sanitizeString(text).substring(0, MAX_COMMENT_LENGTH);

        // Validate cleaned text is not empty
        if (cleanText.length < 1) {
            return new Response(
                JSON.stringify({ error: "Comment cannot be empty" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const comments = await loadComments();

        const newComment: Comment = {
            id: Date.now().toString(),
            postId: cleanPostId,
            username: cleanUsername,
            text: cleanText,
            date: new Date().toISOString(),
        };

        comments.push(newComment);
        await saveComments(comments);

        return new Response(
            JSON.stringify({ success: true, comment: newComment }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to save comment" }),
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

        const cleanPostId = sanitizePostId(postId);
        const comments = await loadComments();
        const postComments = comments
            .filter((c) => c.postId === cleanPostId)
            .sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .slice(0, 100); // Limit to 100 comments

        return new Response(JSON.stringify(postComments), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to load comments" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
