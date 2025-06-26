import crypto from 'crypto';

/**
 * Generates a URL-friendly slug from a given title.
 * The slug is lowercased, trimmed, and special characters are removed.
 * Spaces are replaced with dashes, and multiple dashes are collapsed.
 * The resulting slug is limited to 80 characters.
 *
 * @param {string} title - The title to be converted into a slug.
 * @returns {string} - The generated slug.
 */


export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')      // remove special chars
        .replace(/\s+/g, '-')              // replace spaces with dashes
        .replace(/-+/g, '-')               // collapse multiple dashes
        .substring(0, 80);                 // optional: limit slug length
}


export function generateUniqueSlug(title: string): string {
    const slug = generateSlug(title);
    const suffix = crypto.randomBytes(3).toString('hex'); // 6-char random string
    return `${slug}-${suffix}`;
}
