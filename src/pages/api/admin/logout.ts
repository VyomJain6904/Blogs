import type { APIRoute } from "astro";
import { activeSessions } from "../../../middleware";

export const POST: APIRoute = async ({ cookies }) => {
    try {
        const sessionToken = cookies.get("admin_session")?.value;

        if (sessionToken) {
            activeSessions.delete(sessionToken);
        }

        cookies.delete("admin_session", {
            path: "/",
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: "Logged out successfully",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: "Logout failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
