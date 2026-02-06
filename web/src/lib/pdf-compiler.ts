import { $typst } from '@myriaddreamin/typst.ts';

let initPromise: Promise<void> | null = null;
let initError: Error | null = null;
let initialized = false;

export async function initCompiler(): Promise<void> {
	if (initialized) return;
	if (initError) throw initError;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		try {
			// Configure the compiler to load WASM from static folder
			$typst.setCompilerInitOptions({
				getModule: () => fetch('/typst_ts_web_compiler_bg.wasm').then(r => r.arrayBuffer())
			});
			$typst.setRendererInitOptions({
				getModule: () => fetch('/typst_ts_renderer_bg.wasm').then(r => r.arrayBuffer())
			});
			// Initialize by doing a simple compile - this will load fonts from CDN
			await $typst.pdf({ mainContent: '' });
			initialized = true;
		} catch (err) {
			initError = err instanceof Error ? err : new Error(String(err));
			initPromise = null;
			throw initError;
		}
	})();

	return initPromise;
}

export async function compileToPdf(typstCode: string): Promise<Uint8Array> {
	await initCompiler();

	try {
		const pdfData = await $typst.pdf({ mainContent: typstCode });
		return pdfData;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(message);
	}
}

export async function compileToSvg(typstCode: string): Promise<string> {
	await initCompiler();

	try {
		const svgData = await $typst.svg({ mainContent: typstCode });
		return svgData;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(message);
	}
}

export function downloadPdf(pdfData: Uint8Array, filename: string = 'resume.pdf'): void {
	const blob = new Blob([pdfData], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
