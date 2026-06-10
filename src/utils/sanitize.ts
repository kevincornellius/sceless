import DOMPurify from "dompurify";

export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ADD_ATTR: ["target"],
        ALLOW_DATA_ATTR: false,
    });
}
