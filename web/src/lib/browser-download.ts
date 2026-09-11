const REVOKE_DELAY_MS = 1_000;

/** Starts a browser download and keeps its object URL alive long enough for asynchronous consumers. */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.hidden = true;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
