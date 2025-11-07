import type { APIRoute } from "astro";
import WriteupsConfig from "../../../geeklurk";
import { activeSessions } from "../../middleware";
import fs from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_IMAGES = 20;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
];

function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .replace(/\.+/g, ".")
        .replace(/_{2,}/g, "_")
        .toLowerCase();
}

function sanitizeMarkdown(content: string): string {
    let cleaned = content.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ""
    );
    cleaned = cleaned.replace(/javascript:/gi, "");
    cleaned = cleaned.replace(/data:text\/html/gi, "");
    cleaned = cleaned.replace(/vbscript:/gi, "");
    cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
    return cleaned;
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
        .trim();
}

function validateImageFile(
    file: File,
    maxSize: number
): { valid: boolean; error?: string } {
    if (file.size > maxSize) {
        return { valid: false, error: `Image ${file.name} exceeds size limit` };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { valid: false, error: `Invalid image type: ${file.type}` };
    }

    const filename = file.name.toLowerCase();
    if (filename.match(/\.(php|exe|sh|bat|cmd|js|html|htm)\./)) {
        return { valid: false, error: "Suspicious file extension detected" };
    }

    return { valid: true };
}

async function verifyImageContent(buffer: Buffer): Promise<boolean> {
    const magicNumbers: { [key: string]: number[] } = {
        jpeg: [0xff, 0xd8, 0xff],
        png: [0x89, 0x50, 0x4e, 0x47],
        gif: [0x47, 0x49, 0x46],
        webp: [0x52, 0x49, 0x46, 0x46],
    };

    for (const magic of Object.values(magicNumbers)) {
        if (magic.every((byte, i) => buffer[i] === byte)) {
            return true;
        }
    }

    return false;
}

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 100);
}

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const sessionToken = cookies.get("admin_session")?.value;
        if (!sessionToken || !activeSessions.has(sessionToken)) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({ error: "Request too large" }),
                { status: 413, headers: { "Content-Type": "application/json" } }
            );
        }

        const formData = await request.formData();

        const mdFile = formData.get("mdFile") as File;
        const title = sanitizeString(formData.get("title") as string);
        const description = sanitizeString(
            (formData.get("description") as string) || ""
        );
        const platform = sanitizeString(
            (formData.get("platform") as string) || ""
        );
        const difficulty = sanitizeString(
            (formData.get("difficulty") as string) || ""
        );
        const category = sanitizeString(
            (formData.get("category") as string) || ""
        );
        const platformAvatar = formData.get("platformAvatar") as File | null;
        const coverImage = formData.get("coverImage") as File | null;
        const images = formData.getAll("images") as File[];

        if (!mdFile || !title || !platform || !difficulty) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!mdFile.name.endsWith(".md")) {
            return new Response(
                JSON.stringify({ error: "Invalid file type. Must be .md" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (mdFile.size > MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({ error: "Markdown file too large" }),
                { status: 413, headers: { "Content-Type": "application/json" } }
            );
        }

        if (title.length < 3 || title.length > 200) {
            return new Response(
                JSON.stringify({ error: "Title must be 3-200 characters" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (images.length > MAX_IMAGES) {
            return new Response(
                JSON.stringify({
                    error: `Maximum ${MAX_IMAGES} images allowed`,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        let mdContent = await mdFile.text();
        mdContent = sanitizeMarkdown(mdContent);

        const slug = generateSlug(title);
        const writeupDir = path.join(
            process.cwd(),
            "public",
            "assets",
            "writeups",
            slug
        );

        try {
            await fs.access(writeupDir);
            return new Response(
                JSON.stringify({
                    error: "A writeup with this title already exists",
                }),
                { status: 409, headers: { "Content-Type": "application/json" } }
            );
        } catch {
            // Directory doesn't exist, proceed
        }

        await fs.mkdir(writeupDir, { recursive: true });

        let platformAvatarPath = "";
        if (platformAvatar && platformAvatar.size > 0) {
            const validation = validateImageFile(
                platformAvatar,
                MAX_AVATAR_SIZE
            );
            if (!validation.valid) {
                return new Response(
                    JSON.stringify({ error: validation.error }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            const avatarBuffer = Buffer.from(
                await platformAvatar.arrayBuffer()
            );
            if (!(await verifyImageContent(avatarBuffer))) {
                return new Response(
                    JSON.stringify({ error: "Invalid platform avatar format" }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            const avatarExt = path.extname(platformAvatar.name).toLowerCase();
            const safeAvatarName = sanitizeFilename(
                `platform-avatar${avatarExt}`
            );
            platformAvatarPath = `./assets/writeups/${slug}/${safeAvatarName}`;

            await fs.writeFile(
                path.join(writeupDir, safeAvatarName),
                avatarBuffer
            );
        }

        let coverPath = "";
        if (coverImage && coverImage.size > 0) {
            const validation = validateImageFile(coverImage, MAX_IMAGE_SIZE);
            if (!validation.valid) {
                return new Response(
                    JSON.stringify({ error: validation.error }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            const coverBuffer = Buffer.from(await coverImage.arrayBuffer());
            if (!(await verifyImageContent(coverBuffer))) {
                return new Response(
                    JSON.stringify({ error: "Invalid cover image format" }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            const coverExt = path.extname(coverImage.name).toLowerCase();
            const safeCoverName = sanitizeFilename(`cover${coverExt}`);
            coverPath = `./assets/writeups/${slug}/${safeCoverName}`;

            await fs.writeFile(
                path.join(writeupDir, safeCoverName),
                coverBuffer
            );
        }

        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            if (!image || image.size === 0) continue;

            const validation = validateImageFile(image, MAX_IMAGE_SIZE);
            if (!validation.valid) {
                await fs.rm(writeupDir, { recursive: true, force: true });
                return new Response(
                    JSON.stringify({ error: validation.error }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            const imageBuffer = Buffer.from(await image.arrayBuffer());
            if (!(await verifyImageContent(imageBuffer))) {
                await fs.rm(writeupDir, { recursive: true, force: true });
                return new Response(
                    JSON.stringify({ error: "Invalid image format detected" }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            const ext = path.extname(image.name).toLowerCase();
            const safeImageName = sanitizeFilename(`image-${i}${ext}`);

            await fs.writeFile(
                path.join(writeupDir, safeImageName),
                imageBuffer
            );
        }

        const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
published: ${new Date().toISOString().split("T")[0]}
description: "${description.replace(/"/g, '\\"')}"
platform: "${platform.replace(/"/g, '\\"')}"
difficulty: "${difficulty.replace(/"/g, '\\"')}"
${category ? `category: "${category.replace(/"/g, '\\"')}"` : ""}
${platformAvatarPath ? `platformAvatar: "${platformAvatarPath}"` : ""}
${coverPath ? `cover: "${coverPath}"` : ""}
draft: false
---

`;

        const finalContent = frontmatter + mdContent;
        const mdFilePath = path.join(
            process.cwd(),
            "src/contents/posts",
            `${slug}.md`
        );

        await fs.writeFile(mdFilePath, finalContent);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Writeup uploaded successfully",
                slug: slug,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Upload error:", error);
        return new Response(
            JSON.stringify({ error: "Upload failed. Please try again." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
