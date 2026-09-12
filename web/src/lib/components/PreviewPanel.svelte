<script lang="ts">
	import type { CompiledPreview } from '$lib/pdf-compiler';
	import PaginatedPreview from './PaginatedPreview.svelte';

	let {
		showCode,
		typstCode,
		preview,
		isPreviewLoading,
	}: {
		showCode: boolean;
		typstCode: string;
		preview: CompiledPreview | null;
		isPreviewLoading: boolean;
	} = $props();

	function copyToClipboard() {
		navigator.clipboard.writeText(typstCode);
	}
</script>

<div
	class="bg-gray-500 rounded-lg shadow p-4 flex flex-col items-center overflow-auto max-h-[calc(100vh-10rem)] lg:max-h-none lg:h-full"
>
	<h2 class="text-lg font-semibold mb-4 text-white">
		{showCode
			? 'Typst Code'
			: `Resume Preview${preview ? ` · ${preview.pages.length} ${preview.pages.length === 1 ? 'page' : 'pages'}` : ''}`}
	</h2>

	{#if showCode}
		<div class="relative w-full">
			<button class="absolute top-2 right-2 secondary text-xs" onclick={copyToClipboard}>Copy</button>
			<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[calc(100vh-16rem)] text-xs w-full"><code
					>{typstCode}</code
				></pre>
		</div>
	{:else}
		<div class="flex w-full justify-center">
			{#if isPreviewLoading && !preview}
				<div class="flex items-center justify-center h-full text-gray-400">
					<span>Compiling preview...</span>
				</div>
			{:else if preview}
				<PaginatedPreview {preview} />
			{:else}
				<div class="flex items-center justify-center h-full text-gray-400">
					<span>Preview will appear here</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
