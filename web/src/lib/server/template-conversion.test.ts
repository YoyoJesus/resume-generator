import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
	extractDocxTemplateContext,
	generateTypstTemplateFromDesign,
	MAX_OOXML_CONTEXT_CHARS,
	TEMPLATE_CONTENT_MARKER,
	type TemplateDesign,
} from './template-conversion';

const DESIGN: TemplateDesign = {
	paper: 'us-letter',
	margins: { top: 0.5, bottom: 0.5, left: 0.6, right: 0.6 },
	baseSize: 9,
	nameSize: 24,
	contactSize: 8,
	headingSize: 11,
	nameAlignment: 'center',
	primaryColor: '0F766E',
	textColor: '183153',
	mutedColor: '52606D',
	sectionFillColor: 'E6FFFB',
	sectionStyle: 'filled',
	entryLayout: 'split',
	uppercaseName: true,
	uppercaseHeadings: true,
	showHeaderRule: true,
};

describe('DOCX template context extraction', () => {
	it('includes document, style, and header XML while excluding unrelated files', async () => {
		const zip = new JSZip();
		zip.file('word/document.xml', '<document>Resume</document>');
		zip.file('word/styles.xml', '<styles><color val="123456"/></styles>');
		zip.file('word/header1.xml', '<header>Header</header>');
		zip.file('word/media/image1.png', 'not-an-image');

		const context = await extractDocxTemplateContext(await zip.generateAsync({ type: 'nodebuffer' }));
		expect(context).toContain('word/document.xml');
		expect(context).toContain('word/styles.xml');
		expect(context).toContain('word/header1.xml');
		expect(context).not.toContain('word/media/image1.png');
	});

	it('rejects an archive without a Word document part', async () => {
		const zip = new JSZip();
		zip.file('other.xml', '<other/>');
		await expect(extractDocxTemplateContext(await zip.generateAsync({ type: 'nodebuffer' }))).rejects.toThrow(
			'document XML is missing',
		);
	});

	it('caps the extracted XML context', async () => {
		const zip = new JSZip();
		zip.file('word/document.xml', 'x'.repeat(MAX_OOXML_CONTEXT_CHARS + 100));
		const context = await extractDocxTemplateContext(await zip.generateAsync({ type: 'nodebuffer' }));
		expect(context.length).toBeLessThan(MAX_OOXML_CONTEXT_CHARS + 100);
	});
});

describe('Typst generation from an AI design', () => {
	it('generates every required helper and the content marker', () => {
		const result = generateTypstTemplateFromDesign(DESIGN);
		for (const helper of [
			'resume',
			'work-heading',
			'project-heading',
			'education-heading',
			'achievement-heading',
			'skills',
		]) {
			expect(result).toContain(`#let ${helper}`);
		}
		expect(result.endsWith(`${TEMPLATE_CONTENT_MARKER}\n`)).toBe(true);
	});

	it('applies the inferred visual design', () => {
		const result = generateTypstTemplateFromDesign(DESIGN);
		expect(result).toContain('#let primary = rgb("0F766E")');
		expect(result).toContain('paper: "us-letter"');
		expect(result).toContain('author-position: center');
		expect(result).toContain('fill: section-fill');
		expect(result).toContain('columns: (1fr, auto)');
	});

	it('clamps unsafe numeric output and falls back from invalid colors', () => {
		const result = generateTypstTemplateFromDesign({
			...DESIGN,
			baseSize: 100,
			margins: { ...DESIGN.margins, top: -5 },
			primaryColor: 'not-a-color',
		});
		expect(result).toContain('font-size: 14pt');
		expect(result).toContain('top-margin: 0.15in');
		expect(result).toContain('#let primary = rgb("0f766e")');
	});
});
