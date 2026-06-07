<script lang="ts">
	let {
		showCode = $bindable(),
		isCompiling,
		compileError,
		isOverOnePage,
		onDownload,
	}: {
		showCode: boolean;
		isCompiling: boolean;
		compileError: string | null;
		isOverOnePage: boolean;
		onDownload: () => void;
	} = $props();
</script>

<header class="bg-white shadow-sm">
	<div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between flex-wrap gap-2">
			<h1 class="text-2xl font-bold text-gray-900">Resume Builder</h1>
			<div class="flex gap-2">
				<button class="secondary" onclick={() => (showCode = !showCode)}>
					{showCode ? 'Preview' : 'Typst'}
				</button>
				<button class="primary" onclick={onDownload} disabled={isCompiling}>
					{isCompiling ? 'Generating...' : 'Download PDF'}
				</button>
			</div>
		</div>
		{#if compileError}
			<div class="mt-2 text-red-600 text-sm">{compileError}</div>
		{/if}
		{#if isOverOnePage}
			<div class="mt-2 px-3 py-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded text-sm">
				Warning: Your resume may exceed one page. Consider removing some content.
			</div>
		{/if}
	</div>
</header>
