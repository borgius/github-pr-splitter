export const diffSelector = 'tr:not(:last-child) .blob-code-hunk';
export const fileSelector = '.file-header .file-info';
export const prUrl = location.href.match(/(.*\/pull\/\d+).*/)?.[1];
export const files: Record<string, string> = {};

