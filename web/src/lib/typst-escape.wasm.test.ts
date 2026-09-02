// Verifies the escaping against the Typst compiler the app actually ships (the typst.ts WASM
// build, currently Typst 0.14.2) rather than against a locally installed CLI. Slower than the
// other suites because it initializes the compiler and renders each case.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { $typst } from '@myriaddreamin/typst.ts';
import { typstMarkup, typstString } from './typst-escape';
import { generateTypstCode } from './typst-generator';
import { defaultResumeData } from './types';

const COMPILER_WASM = 'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm';
const RENDERER_WASM = 'node_modules/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm';

$typst.setCompilerInitOptions({ getModule: () => readFileSync(COMPILER_WASM).buffer });
$typst.setRendererInitOptions({ getModule: () => readFileSync(RENDERER_WASM).buffer });

const PAGE = '#set page(width: auto, height: auto, margin: 4pt)\n';
const compile = (src: string) => $typst.svg({ mainContent: PAGE + src });
const TIMEOUT = { timeout: 300000 };

// Renders the escaped markup, then renders the same text as a plain Typst string. Identical SVG
// means the escaping changed nothing the reader sees.
async function roundTrips(text: string): Promise<boolean> {
	return (await compile(typstMarkup(text))) === (await compile(`#"${typstString(text)}"`));
}

const BACKSLASH = String.fromCharCode(92);
const SPECIALS = ['#', '$', '*', '_', '`', '<', '>', '@', '~', '[', ']', '/', '-', '+', '=', "'", '"', BACKSLASH];

it('distinguishes different text, so the comparison means something', TIMEOUT, async () => {
	expect(await compile('hello')).not.toEqual(await compile('world'));
});

it('surfaces a compile error as a rejection, so a broken document cannot pass silently', TIMEOUT, async () => {
	await expect(compile('#assert.eq("a", "b")')).rejects.toThrow();
});

it('does not round-trip unescaped emphasis', TIMEOUT, async () => {
	expect(await compile('a *bold* b')).not.toEqual(await compile('#"a *bold* b"'));
});

it('does not round-trip what the previous escaping produced', TIMEOUT, async () => {
	const text = 'saved $1M via a *big* push';
	const oldEscaped = text.replace(/\$/g, '\\$');
	expect(await compile(oldEscaped)).not.toEqual(await compile(`#"${typstString(text)}"`));
});

it('renders every escaped special as the literal character', TIMEOUT, async () => {
	const broken: string[] = [];
	for (const ch of SPECIALS) {
		if (!(await roundTrips(`a${ch}b`))) broken.push(ch);
	}
	expect(broken).toEqual([]);
});

it('renders a full injection payload as literal text', TIMEOUT, async () => {
	const payload =
		'shipped it] #eval("1+1") #[ *stars* _under_ <tags> @refs C:' + BACKSLASH + 'tools 30%+ a/b=c ~x~ `t`';
	expect(await roundTrips(payload)).toBe(true);
});

it('compiles a resume with payloads in every field', TIMEOUT, async () => {
	const data = structuredClone(defaultResumeData);
	data.personalInfo = {
		name: 'Bob", author: "evil',
		phone: '555',
		location: 'NY',
		email: 'a@b.co',
		website: 'ex.com',
		linkedin: 'bob',
		github: 'bob',
	};
	data.profile.summary = 'C# and $100k. Uses *stars*, _under_, [brackets], <tags>, @refs.';
	data.workExperience = [
		{
			id: 'w1',
			title: 'C# Developer',
			company: 'Acme & Sons "Ltd"',
			location: 'NY',
			startDate: '2020, month: 1, day: 1) ; let pwned = eval("1+1") ; datetime(year: 2021-01',
			endDate: '2022-13',
			isPresent: false,
			bullets: ['shipped it] #eval("1+1") #[', 'saved $1M (30% #tag) via C:' + BACKSLASH + 'tools'],
		},
	];
	data.projects = [
		{ id: 'p1', name: 'Thing #1', stack: 'TS', url: 'javascript:alert(1)', award: '1st', bullets: ['a] b'] },
	];
	data.skills = [{ id: 's1', category: 'Langs', skills: 'C#, F#, C++, <all>' }];
	data.achievements = [{ id: 'a1', title: 'Award #2', date: '2021-06', description: 'Got $5k] #eval("2+2")' }];
	data.colors.headColor = '000"); #eval("1+1"); rgb("000';
	data.fonts.baseSize = 9000;

	const code = generateTypstCode(data);
	expect(code).not.toContain('pwned');
	await expect(compile(code)).resolves.toBeTruthy();
});
