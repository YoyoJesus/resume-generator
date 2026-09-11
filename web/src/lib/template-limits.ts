// Leaves headroom below Vercel's 4.5 MB request-body limit for multipart framing.
export const DOCX_TEMPLATE_MAX_BYTES = 4 * 1024 * 1024;
export const DOCX_TEMPLATE_MAX_LABEL = '4 MB';
