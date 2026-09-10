<script lang="ts">
	import { compileToPdf } from '$lib/pdf-compiler';
	import { generateTypstCode, RESUME_CONTENT_MARKER } from '$lib/typst-generator';
	import {
		customTemplateStore,
		MAX_TEMPLATE_SIZE,
		validateTemplateSource,
		type CustomTemplate,
	} from '$lib/template-store';
	import type { ResumeData } from '$lib/types';

	let {
		open = $bindable(),
		data,
		currentTemplate,
	}: {
		open: boolean;
		data: ResumeData;
		currentTemplate: CustomTemplate | null;
	} = $props();

	type Status = 'idle' | 'validating' | 'error';
	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let acknowledged = $state(false);
	let dragOver = $state(false);
	let fileInput = $state<HTMLInputElement>();

	function close() {
		if (status === 'validating') return;
		open = false;
		status = 'idle';
		errorMessage = '';
		acknowledged = false;
		dragOver = false;
	}

	async function handleFile(file: File) {
		if (!acknowledged) return;
		status = 'validating';
		errorMessage = '';

		try {
			if (!file.name.toLowerCase().endsWith('.typ')) throw new Error('Choose a Typst file ending in .typ.');
			if (file.size > MAX_TEMPLATE_SIZE) throw new Error('The template must be 1 MB or smaller.');

			const source = await file.text();
			const contractError = validateTemplateSource(source);
			if (contractError) throw new Error(contractError);

			// Compilation is the final gate. Nothing is cached until the combined template
			// and current resume have produced a PDF successfully in the browser.
			await compileToPdf(generateTypstCode(data, source));
			customTemplateStore.save({ name: file.name, source });
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
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) close();
		}}
	>
		<div class="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
			<div class="flex items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold">Use your Typst template</h2>
					{#if currentTemplate}
						<p class="mt-0.5 text-xs text-green-700">Active: {currentTemplate.name}</p>
					{/if}
				</div>
				<button
					class="secondary px-2 py-1 text-sm"
					onclick={close}
					disabled={status === 'validating'}
					aria-label="Close">X</button
				>
			</div>

			<div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
				<p class="font-medium">Template compatibility</p>
				<p class="mt-1">
					Your file must define the same resume and section helpers as the starter template and include this marker:
				</p>
				<code class="mt-2 block overflow-x-auto rounded bg-white/70 px-2 py-1 text-xs">{RESUME_CONTENT_MARKER}</code>
				<p class="mt-2 text-xs">Content after the marker is replaced with the resume currently in the form.</p>
				<p class="mt-1 text-xs">A valid template is kept only for this browser tab's session.</p>
				<button class="secondary mt-3 text-xs" type="button" onclick={downloadStarterTemplate}
					>Download starter template</button
				>
			</div>

			<label class="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 p-3">
				<input class="mt-0.5" type="checkbox" bind:checked={acknowledged} disabled={status === 'validating'} />
				<span class="text-sm font-normal text-gray-700">
					I understand that custom Typst code runs locally in my browser and must follow the template contract above.
				</span>
			</label>

			<button
				type="button"
				disabled={!acknowledged || status === 'validating'}
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
				{#if status === 'validating'}
					<span class="text-gray-700">Validating and compiling template...</span>
				{:else}
					<span class="text-gray-600">Drag a .typ file here, or click to browse</span>
					<span class="mt-1 block text-xs text-gray-400">Typst source - max 1 MB</span>
				{/if}
			</button>
			<input bind:this={fileInput} type="file" accept=".typ,text/plain" class="hidden" onchange={onPick} />

			{#if status === 'error'}
				<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					<p class="font-medium">Template validation failed</p>
					<p class="mt-1 break-words">{errorMessage}</p>
				</div>
			{/if}

			<div class="flex justify-between gap-2">
				{#if currentTemplate}
					<button class="danger" type="button" onclick={useDefaultTemplate} disabled={status === 'validating'}
						>Use default template</button
					>
				{:else}
					<span></span>
				{/if}
				<button class="secondary" type="button" onclick={close} disabled={status === 'validating'}>Cancel</button>
			</div>
		</div>
	</div>
{/if}
