import { $typst } from '@myriaddreamin/typst.ts';
import { downloadBlob } from './browser-download';

let initPromise: Promise<void> | null = null;
let initError: Error | null = null;
let initialized = false;

export interface PreviewPage {
	pageOffset: number;
	width: number;
	height: number;
}

export interface CompiledPreview {
	svg: string;
	pages: PreviewPage[];
}

export async function initCompiler(): Promise<void> {
	if (initialized) return;
	if (initError) throw initError;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		try {
			// Configure the compiler to load WASM from static folder
			$typst.setCompilerInitOptions({
				getModule: () => fetch('/typst_ts_web_compiler_bg.wasm').then((r) => r.arrayBuffer()),
			});
			$typst.setRendererInitOptions({
				getModule: () => fetch('/typst_ts_renderer_bg.wasm').then((r) => r.arrayBuffer()),
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
		if (!pdfData) throw new Error('PDF compilation returned no data');
		return pdfData;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(message);
	}
}

export async function compileToPreview(typstCode: string): Promise<CompiledPreview> {
	await initCompiler();

	try {
		const vectorData = await $typst.vector({ mainContent: typstCode });
		if (!vectorData) throw new Error('Preview compilation returned no data');

		const renderer = await $typst.getRenderer();
		return renderer.runWithSession({ format: 'vector', artifactContent: vectorData }, async (session) => ({
			svg: await session.renderSvg({}),
			pages: session.retrievePagesInfo(),
		}));
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(message);
	}
}

export async function compileToSvg(typstCode: string): Promise<string> {
	return (await compileToPreview(typstCode)).svg;
}

export function downloadPdf(pdfData: Uint8Array, filename: string = 'resume.pdf'): void {
	const blob = new Blob([new Uint8Array(pdfData)], { type: 'application/pdf' });
	downloadBlob(blob, filename);
}
