import { createTypstCompiler, type TypstCompiler } from '@myriaddreamin/typst.ts/compiler';

let compiler: TypstCompiler | null = null;
let initPromise: Promise<void> | null = null;

export async function initCompiler(): Promise<void> {
	if (compiler) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		compiler = createTypstCompiler();
		await compiler.init();
	})();

	return initPromise;
}

export async function compileToPdf(typstCode: string): Promise<Uint8Array> {
	await initCompiler();
	if (!compiler) throw new Error('Compiler not initialized');

	// Reset and add the main file
	await compiler.reset();
	compiler.addSource('/main.typ', typstCode);

	// Compile to PDF (format 1 = pdf)
	const result = await compiler.compile({
		mainFilePath: '/main.typ',
		format: 1 // CompileFormatEnum.pdf
	});

	if (!result.result) {
		const errors = result.diagnostics?.map(d =>
			typeof d === 'string' ? d : d.message
		).join('\n') || 'Unknown compilation error';
		throw new Error(errors);
	}

	return result.result;
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
