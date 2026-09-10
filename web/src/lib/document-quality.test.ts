import { describe, expect, it } from 'vitest';
import {
	MAX_EXTRACTED_TEXT_CHARS,
	extensionOf,
	measureDocumentQuality,
	validateExtractedDocument,
} from './document-quality';
import { preflightDocument } from './document-preflight';

const RESUME_TEXT = `Alex Morgan
Software Engineer
alex@example.com | 555-0100

Experience
Software Engineer at Example Company from January 2022 to Present
- Built accessible web applications using TypeScript and Svelte.
- Improved document processing reliability and reduced response time.

Education
Bachelor of Science in Computer Science, Example University, 2021

Skills
TypeScript, JavaScript, Svelte, testing, accessibility, and technical writing.`;

describe('document quality metrics', () => {
	it('passes readable resume text and reports deterministic metrics', () => {
		const metrics = measureDocumentQuality(RESUME_TEXT, { method: 'text', pageCount: 2, durationMs: 12.6 });
		expect(metrics.status).toBe('pass');
		expect(metrics.score).toBe(100);
		expect(metrics.wordCount).toBeGreaterThan(50);
		expect(metrics.pageCount).toBe(2);
		expect(metrics.durationMs).toBe(13);
	});

	it('warns for sparse but still usable text', () => {
		const text = 'Alex Morgan software engineer with TypeScript experience. '.repeat(6);
		const metrics = measureDocumentQuality(text, { method: 'text' });
		expect(metrics.status).toBe('warning');
		expect(metrics.warnings.length).toBeGreaterThan(0);
	});

	it('fails unreadable text and low-confidence OCR', () => {
		const metrics = measureDocumentQuality('! @ # ? '.repeat(30), {
			method: 'ocr',
			ocrAverageConfidence: 22,
		});
		expect(metrics.status).toBe('fail');
		expect(metrics.score).toBeLessThan(40);
		expect(metrics.warnings).toContain('OCR confidence is too low.');
	});

	it('validates filenames, quality, and extracted text size on the server boundary', () => {
		expect(extensionOf('RESUME.PDF')).toBe('pdf');
		expect(validateExtractedDocument('resume.pdf', RESUME_TEXT)).toBeNull();
		expect(validateExtractedDocument('resume.exe', RESUME_TEXT)).toContain('Unsupported');
		expect(validateExtractedDocument('resume.txt', 'tiny')).toContain('Too little');
		expect(validateExtractedDocument('resume.txt', 'x'.repeat(MAX_EXTRACTED_TEXT_CHARS + 1))).toContain('too long');
	});
});

describe('document preflight', () => {
	it('extracts and scores a TXT resume without AI', async () => {
		const file = new File([RESUME_TEXT], 'resume.txt', { type: 'text/plain' });
		const result = await preflightDocument(file);

		expect(result.filename).toBe('resume.txt');
		expect(result.text).toContain('Software Engineer');
		expect(result.preview).toContain('Alex Morgan');
		expect(result.metrics.method).toBe('text');
		expect(result.metrics.status).toBe('pass');
	});

	it('rejects unsupported files before extraction', async () => {
		const file = new File([RESUME_TEXT], 'resume.rtf');
		await expect(preflightDocument(file)).rejects.toThrow('Unsupported file');
	});
});
