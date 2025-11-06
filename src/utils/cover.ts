import { GetIndexFromSlugID } from "./hash";
import WriteupsConfig from "../../geeklurk";

/**
 * Retrieves the cover URL for an unspecified entry based on the provided ID.
 *
 * @param id - The unique identifier for the entry.
 * @returns The URL of the corresponding cover image.
 */
export function GetCoverURLForUnspecifiedEntry(id: string): string {
    const index = GetIndexFromSlugID(id, WriteupsConfig.banners.length);
    return WriteupsConfig.banners[index];
}
