<script lang="ts">
	import { tick } from 'svelte';
	import { generateTypstCode, RESUME_CONTENT_MARKER } from '$lib/typst-generator';
	import {
		customTemplateStore,
		MAX_TEMPLATE_SIZE,
		validateTemplateCompatibility,
		type CustomTemplate,
	} from '$lib/template-store';
	import type { ResumeData } from '$lib/types';
	import { DOCX_TEMPLATE_MAX_BYTES, DOCX_TEMPLATE_MAX_LABEL } from '$lib/template-limits';

	let {
		open = $bindable(),
		data,
		currentTemplate,
	}: {
		open: boolean;
		data: ResumeData;
		currentTemplate: CustomTemplate | null;
	} = $props();

	type Status = 'idle' | 'converting' | 'validating' | 'error';
	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let acknowledged = $state(false);
	let dragOver = $state(false);
	let fileInput = $state<HTMLInputElement>();
	let dialog = $state<HTMLDivElement>();
	let isBusy = $derived(status === 'converting' || status === 'validating');

	$effect(() => {
		if (!open) return;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		void tick().then(() => dialog?.focus());
		return () => opener?.focus();
	});

	function close() {
		if (isBusy) return;
		open = false;
		status = 'idle';
		errorMessage = '';
		acknowledged = false;
		dragOver = false;
	}

	async function handleFile(file: File) {
		if (!acknowledged) return;
		errorMessage = '';

		try {
			const lowerName = file.name.toLowerCase();
			const isTypst = lowerName.endsWith('.typ');
			const isDocx = lowerName.endsWith('.docx');
			if (!isTypst && !isDocx) throw new Error('Choose a Typst (.typ) or Word (.docx) template.');
			if (isTypst && file.size > MAX_TEMPLATE_SIZE) throw new Error('The Typst template must be 1 MB or smaller.');
			if (isDocx && file.size > DOCX_TEMPLATE_MAX_BYTES) {
				throw new Error(`The DOCX template must be ${DOCX_TEMPLATE_MAX_LABEL} or smaller.`);
			}

			let template: CustomTemplate;
			if (isDocx) {
				status = 'converting';
				const form = new FormData();
				form.append('file', file);
				const response = await fetch('/api/template/convert', { method: 'POST', body: form });
				if (!response.ok) {
					let message = "AI couldn't convert that Word template. Please try again.";
					try {
						const body = await response.json();
						if (body?.error?.message) message = body.error.message;
					} catch {
						// Keep the fallback when the platform returns a non-JSON error page.
					}
					throw new Error(message);
				}
				const body = (await response.json()) as { data: CustomTemplate };
				template = body.data;
			} else {
				template = { name: file.name, source: await file.text() };
			}

			status = 'validating';
			const contractError = await validateTemplateCompatibility(template.source);
			if (contractError) throw new Error(contractError);

			// Nothing is cached until a fully populated fixture has exercised every helper.
			customTemplateStore.save(template);
			status = 'idle';
			close();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'The template could not be loaded.';
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

	function useDefaultTemplate() {
		customTemplateStore.clear();
		close();
	}

	function downloadStarterTemplate() {
		const blob = new Blob([generateTypstCode(data)], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'resume-template.typ';
		anchor.click();
		URL.revokeObjectURL(url);
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
				'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
			),
		).filter((element) => !element.hasAttribute('hidden'));
		if (focusable.length === 0) {
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
			class="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="template-dialog-title"
			tabindex="-1"
			onkeydown={onDialogKeydown}
		>
			<div class="flex items-center justify-between gap-3">
				<div>
					<h2 id="template-dialog-title" class="text-lg font-semibold">Use a custom resume template</h2>
					{#if currentTemplate}
						<p class="mt-0.5 text-xs text-green-700">Active: {currentTemplate.name}</p>
					{/if}
				</div>
				<button class="secondary px-2 py-1 text-sm" onclick={close} disabled={isBusy} aria-label="Close">X</button>
			</div>

			<div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
				<p class="font-medium">Template compatibility</p>
				<p class="mt-1">
					A Typst file must define the same resume and section helpers as the starter template and include this marker:
				</p>
				<code class="mt-2 block overflow-x-auto rounded bg-white/70 px-2 py-1 text-xs">{RESUME_CONTENT_MARKER}</code>
				<p class="mt-2 text-xs">Content after the marker is replaced with the resume currently in the form.</p>
				<p class="mt-1 text-xs">A valid template is kept only for this browser tab's session.</p>
				<p class="mt-1 text-xs">Word templates are sent to AI for conversion; Typst templates stay local.</p>
				<p class="mt-1 text-xs">Images and Word-only effects may be approximated or omitted.</p>
				<button class="secondary mt-3 text-xs" type="button" onclick={downloadStarterTemplate}
					>Download starter template</button
				>
			</div>

			<label class="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 p-3">
				<input class="mt-0.5" type="checkbox" bind:checked={acknowledged} disabled={isBusy} />
				<span class="text-sm font-normal text-gray-700">
					I understand the template requirements and that a DOCX file will be sent to the configured AI service for
					conversion.
				</span>
			</label>

			<button
				type="button"
				disabled={!acknowledged || isBusy}
				class="w-full rounded-lg border-2 border-dashed p-7 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 {dragOver
					? 'border-purple-500 bg-purple-50'
					: 'border-gray-300 hover:border-gray-400'}"
				ondragover={(event) => {
					event.preventDefault();
					if (acknowledged) dragOver = true;
				}}
				ondragleave={() => (dragOver = false)}
				ondrop={onDrop}
				onclick={() => fileInput?.click()}
			>
				{#if status === 'converting'}
					<span class="text-gray-700">Converting Word template with AI...</span>
				{:else if status === 'validating'}
					<span class="text-gray-700">Validating and compiling template...</span>
				{:else}
					<span class="text-gray-600">Drag a .typ or .docx file here, or click to browse</span>
					<span class="mt-1 block text-xs text-gray-400">Typst max 1 MB; Word max {DOCX_TEMPLATE_MAX_LABEL}</span>
				{/if}
			</button>
			<input
				bind:this={fileInput}
				type="file"
				accept=".typ,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
				class="hidden"
				onchange={onPick}
			/>

			{#if status === 'error'}
				<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					<p class="font-medium">Template upload failed</p>
					<p class="mt-1 break-words">{errorMessage}</p>
				</div>
			{/if}

			<div class="flex justify-between gap-2">
				{#if currentTemplate}
					<button class="danger" type="button" onclick={useDefaultTemplate} disabled={isBusy}
						>Use default template</button
					>
				{:else}
					<span></span>
				{/if}
				<button class="secondary" type="button" onclick={close} disabled={isBusy}>Cancel</button>
			</div>
		</div>
	</div>
{/if}
