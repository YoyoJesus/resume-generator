import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	const session = {
		renderSvg: vi.fn().mockResolvedValue('<svg class="typst-doc"></svg>'),
		retrievePagesInfo: vi.fn().mockReturnValue([
			{ pageOffset: 0, width: 595, height: 842 },
			{ pageOffset: 1, width: 595, height: 842 },
		]),
	};
	return {
		pdf: vi.fn().mockResolvedValue(new Uint8Array([1])),
		vector: vi.fn().mockResolvedValue(new Uint8Array([2])),
		runWithSession: vi.fn(async (_options, work) => work(session)),
		session,
	};
});

vi.mock('@myriaddreamin/typst.ts', () => ({
	$typst: {
		setCompilerInitOptions: vi.fn(),
		setRendererInitOptions: vi.fn(),
		pdf: mocks.pdf,
		vector: mocks.vector,
		getRenderer: vi.fn().mockResolvedValue({ runWithSession: mocks.runWithSession }),
	},
}));

import { compileToPreview } from './pdf-compiler';

beforeEach(() => vi.clearAllMocks());

it('returns each page reported by the renderer with the compiled SVG', async () => {
	const preview = await compileToPreview('#pagebreak()');

	expect(preview).toEqual({
		svg: '<svg class="typst-doc"></svg>',
		pages: [
			{ pageOffset: 0, width: 595, height: 842 },
			{ pageOffset: 1, width: 595, height: 842 },
		],
	});
	expect(mocks.vector).toHaveBeenCalledWith({ mainContent: '#pagebreak()' });
	expect(mocks.runWithSession).toHaveBeenCalledWith(
		{ format: 'vector', artifactContent: new Uint8Array([2]) },
		expect.any(Function),
	);
});
