<script lang="ts">
	import { tick } from 'svelte';
	import { resumeStore } from '$lib/store';
	import { buildResumeFromExtraction } from '$lib/resume-utils';
	import { setHighlightsFromData } from '$lib/ai-highlight';
	import { preflightDocument, type PreflightResult } from '$lib/document-preflight';
	import type { ExtractedResume } from '$lib/types';

	let { open = $bindable(), onApplied }: { open: boolean; onApplied: () => void } = $props();

	type Status = 'idle' | 'analyzing' | 'review' | 'processing' | 'error';
	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let progressMessage = $state('Checking document...');
	let dragOver = $state(false);
	let acknowledged = $state(false);
	let result = $state<PreflightResult | null>(null);
	let fileInput = $state<HTMLInputElement>();
	let dialog = $state<HTMLDivElement>();
	let isBusy = $derived(status === 'analyzing' || status === 'processing');

	const ACCEPT = '.pdf,.docx,.txt';

	$effect(() => {
		if (!open) return;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		void tick().then(() => dialog?.focus());
		return () => opener?.focus();
	});

	function reset() {
		status = 'idle';
		errorMessage = '';
		progressMessage = 'Checking document...';
		dragOver = false;
		acknowledged = false;
		result = null;
	}

	function close() {
		if (isBusy) return;
		open = false;
		reset();
	}

	async function handleFile(file: File) {
		status = 'analyzing';
		errorMessage = '';
		result = null;
		acknowledged = false;
		try {
			result = await preflightDocument(file, ({ message }) => {
				progressMessage = message;
			});
			status = 'review';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : "Couldn't read that document.";
			status = 'error';
		}
	}

	async function sendToAI() {
		if (!result || !acknowledged || result.metrics.status === 'fail') return;
		status = 'processing';
		errorMessage = '';
		try {
			const response = await fetch('/api/extract', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ filename: result.filename, text: result.text, metrics: result.metrics }),
			});

			if (!response.ok) {
				let message = "Can't reach the AI service. Check your connection and retry.";
				try {
					const body = await response.json();
					if (body?.error?.message) message = body.error.message;
				} catch {
					// Keep the fallback when the platform returns a non-JSON error page.
				}
				throw new Error(message);
			}

			const body = (await response.json()) as { data: ExtractedResume };
			const resume = buildResumeFromExtraction(body.data);
			resumeStore.set(resume);
			setHighlightsFromData(resume);
			onApplied();
			status = 'review';
			close();
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : "Can't reach the AI service. Check your connection and retry.";
			status = 'error';
		}
	}

	function onPick(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) void handleFile(file);
		target.value = '';
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) void handleFile(file);
	}

	function onDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return;
		}
		if (event.key !== 'Tab' || !dialog) return;
		const focusable = Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
			),
		);
		if (!focusable.length) {
			event.preventDefault();
			dialog.focus();
			return;
		}
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function percent(value: number): string {
		return `${Math.round(value * 100)}%`;
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) close();
		}}
	>
		<div
			bind:this={dialog}
			class="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="resume-upload-title"
			tabindex="-1"
			onkeydown={onDialogKeydown}
		>
			<div class="flex items-center justify-between gap-3">
				<h2 id="resume-upload-title" class="text-lg font-semibold">Upload your resume</h2>
				<button class="secondary px-2 py-1 text-sm" onclick={close} disabled={isBusy} aria-label="Close">X</button>
			</div>

			{#if status === 'idle'}
				<div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
					<p class="font-medium">Your document is checked before AI sees it</p>
					<p class="mt-1 text-xs">
						Text extraction and Tesseract OCR run in this browser. You can review readability metrics and a text preview
						before choosing whether to send the extracted text to AI.
					</p>
				</div>
				<button
					type="button"
					class="w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
						? 'border-purple-500 bg-purple-50'
						: 'border-gray-300 hover:border-gray-400'}"
					ondragover={(event) => {
						event.preventDefault();
						dragOver = true;
					}}
					ondragleave={() => (dragOver = false)}
					ondrop={onDrop}
					onclick={() => fileInput?.click()}
				>
					<span class="text-gray-600">Drag a file here, or click to browse</span>
					<span class="mt-1 block text-xs text-gray-400">PDF, DOCX, or TXT — max 5 MB</span>
				</button>
				<input bind:this={fileInput} type="file" accept={ACCEPT} class="hidden" onchange={onPick} />
			{:else if status === 'analyzing' || status === 'processing'}
				<div class="flex flex-col items-center gap-3 py-8" aria-live="polite">
					<div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600"></div>
					<p class="text-sm text-gray-600">
						{status === 'processing' ? 'Structuring your resume with AI...' : progressMessage}
					</p>
					{#if status === 'analyzing'}
						<p class="text-center text-xs text-gray-400">OCR can take a minute on scanned PDFs.</p>
					{/if}
				</div>
			{:else if status === 'review' && result}
				<div class="space-y-3">
					<div
						class="rounded-md border p-3 {result.metrics.status === 'pass'
							? 'border-green-200 bg-green-50'
							: result.metrics.status === 'warning'
								? 'border-yellow-300 bg-yellow-50'
								: 'border-red-200 bg-red-50'}"
					>
						<div class="flex items-center justify-between gap-2">
							<p class="font-medium capitalize">Readability: {result.metrics.status}</p>
							<p class="text-sm font-semibold">{result.metrics.score}/100</p>
						</div>
						{#if result.metrics.warnings.length}
							<ul class="mt-2 list-disc space-y-1 pl-5 text-xs">
								{#each result.metrics.warnings as warning}
									<li>{warning}</li>
								{/each}
							</ul>
						{/if}
					</div>

					<dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
						<div class="rounded bg-gray-50 p-2">
							<dt class="text-xs text-gray-500">Words</dt>
							<dd>{result.metrics.wordCount}</dd>
						</div>
						<div class="rounded bg-gray-50 p-2">
							<dt class="text-xs text-gray-500">Pages</dt>
							<dd>{result.metrics.pageCount}</dd>
						</div>
						<div class="rounded bg-gray-50 p-2">
							<dt class="text-xs text-gray-500">Method</dt>
							<dd class="capitalize">{result.metrics.method}</dd>
						</div>
						<div class="rounded bg-gray-50 p-2">
							<dt class="text-xs text-gray-500">Text quality</dt>
							<dd>{percent(result.metrics.alphanumericRatio)}</dd>
						</div>
						{#if result.metrics.ocrPages > 0}
							<div class="rounded bg-gray-50 p-2">
								<dt class="text-xs text-gray-500">OCR pages</dt>
								<dd>{result.metrics.ocrPages}</dd>
							</div>
							<div class="rounded bg-gray-50 p-2">
								<dt class="text-xs text-gray-500">OCR confidence</dt>
								<dd>{Math.round(result.metrics.ocrAverageConfidence ?? 0)}%</dd>
							</div>
						{/if}
					</dl>

					<div>
						<p class="mb-1 text-xs font-medium text-gray-600">Extracted text preview</p>
						<pre
							class="max-h-40 overflow-auto whitespace-pre-wrap rounded border bg-gray-50 p-3 text-xs">{result.preview}</pre>
					</div>

					<label class="flex items-start gap-2 rounded border border-gray-200 p-3">
						<input
							class="mt-0.5"
							type="checkbox"
							bind:checked={acknowledged}
							disabled={result.metrics.status === 'fail'}
						/>
						<span class="text-sm font-normal text-gray-700">
							I reviewed the preview and agree to send this extracted text to the configured AI service. The original
							document stays in my browser.
						</span>
					</label>

					<div class="flex justify-between gap-2">
						<button class="secondary" type="button" onclick={reset}>Choose another</button>
						<button
							class="primary"
							type="button"
							onclick={sendToAI}
							disabled={!acknowledged || result.metrics.status === 'fail'}>Send text to AI</button
						>
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-3 py-6 text-center">
					<div class="text-3xl text-red-600">!</div>
					<p class="text-sm font-medium text-gray-800">Upload failed</p>
					<p class="text-sm text-gray-600">{errorMessage}</p>
					<div class="flex gap-2 pt-2">
						<button class="secondary" onclick={close}>Close</button>
						<button class="primary" onclick={reset}>Try another file</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
