<script lang="ts">
	let {
		showCode,
		typstCode,
		svgPreview,
		isPreviewLoading,
	}: {
		showCode: boolean;
		typstCode: string;
		svgPreview: string;
		isPreviewLoading: boolean;
	} = $props();

	function copyToClipboard() {
		navigator.clipboard.writeText(typstCode);
	}
</script>

<div class="bg-gray-500 rounded-lg shadow p-4 flex flex-col items-center overflow-auto max-h-[calc(100vh-10rem)]">
	<h2 class="text-lg font-semibold mb-4 text-white">
		{showCode ? 'Typst Code' : 'Resume Preview (8.5" x 11")'}
	</h2>

	{#if showCode}
		<div class="relative w-full">
			<button class="absolute top-2 right-2 secondary text-xs" onclick={copyToClipboard}>Copy</button>
			<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[calc(100vh-16rem)] text-xs w-full"><code
					>{typstCode}</code
				></pre>
		</div>
	{:else}
		<div class="bg-white shadow-lg overflow-hidden resume-preview" style="width: 100%; max-width: 510px;">
			{#if isPreviewLoading && !svgPreview}
				<div class="flex items-center justify-center h-full text-gray-400">
					<span>Compiling preview...</span>
				</div>
			{:else if svgPreview}
				{@html svgPreview}
			{:else}
				<div class="flex items-center justify-center h-full text-gray-400">
					<span>Preview will appear here</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.resume-preview :global(svg) {
		width: 100%;
		height: auto;
	}
</style>
