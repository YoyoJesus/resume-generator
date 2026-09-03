<script lang="ts">
	import { resumeStore } from '$lib/store';
	import { buildResumeFromExtraction } from '$lib/resume-utils';
	import { setHighlightsFromData } from '$lib/ai-highlight';
	import type { ExtractedResume } from '$lib/types';

	let { open = $bindable(), onApplied }: { open: boolean; onApplied: () => void } = $props();

	type Status = 'idle' | 'processing' | 'error';
	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let dragOver = $state(false);
	let fileInput = $state<HTMLInputElement>();

	const ACCEPT = '.pdf,.docx,.txt';

	function close() {
		open = false;
		status = 'idle';
		errorMessage = '';
		dragOver = false;
	}

	async function handleFile(file: File) {
		status = 'processing';
		errorMessage = '';
		try {
			const form = new FormData();
			form.append('file', file);
			const res = await fetch('/api/extract', { method: 'POST', body: form });

			if (!res.ok) {
				let msg = "Can't reach the AI service. Check your connection and retry.";
				try {
					const body = await res.json();
					if (body?.error?.message) msg = body.error.message;
				} catch {
					// non-JSON response -> keep the connection-style default
				}
				errorMessage = msg;
				status = 'error';
				return;
			}

			const body = (await res.json()) as { data: ExtractedResume };
			const resume = buildResumeFromExtraction(body.data);
			resumeStore.set(resume);
			setHighlightsFromData(resume);
			onApplied();
			close();
		} catch {
			errorMessage = "Can't reach the AI service. Check your connection and retry.";
			status = 'error';
		}
	}

	function onPick(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) handleFile(file);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleFile(file);
	}

	function retry() {
		status = 'idle';
		errorMessage = '';
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget && status !== 'processing') close();
		}}
	>
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">Upload your Resume</h2>
				<button class="secondary text-sm px-2 py-1" onclick={close} disabled={status === 'processing'}>X</button>
			</div>

			{#if status === 'idle'}
				<p class="text-sm text-gray-600">
					Upload a PDF, DOCX, or TXT resume. AI will read it and fill in the form. Filled fields are highlighted in
					purple for you to review.
				</p>
				<button
					type="button"
					class="w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors {dragOver
						? 'border-purple-500 bg-purple-50'
						: 'border-gray-300 hover:border-gray-400'}"
					ondragover={(e) => {
						e.preventDefault();
						dragOver = true;
					}}
					ondragleave={() => (dragOver = false)}
					ondrop={onDrop}
					onclick={() => fileInput?.click()}
				>
					<span class="text-gray-600">Drag a file here, or click to browse</span>
					<span class="block text-xs text-gray-400 mt-1">PDF, DOCX, or TXT - max 5 MB</span>
				</button>
				<input bind:this={fileInput} type="file" accept={ACCEPT} class="hidden" onchange={onPick} />
			{:else if status === 'processing'}
				<div class="flex flex-col items-center gap-3 py-8">
					<div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600"></div>
					<p class="text-sm text-gray-600">Reading your resume with AI...</p>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-3 py-6 text-center">
					<div class="text-red-600 text-3xl">!</div>
					<p class="text-sm font-medium text-gray-800">Upload failed</p>
					<p class="text-sm text-gray-600">{errorMessage}</p>
					<div class="flex gap-2 pt-2">
						<button class="secondary" onclick={close}>Close</button>
						<button class="primary" onclick={retry}>Retry</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
