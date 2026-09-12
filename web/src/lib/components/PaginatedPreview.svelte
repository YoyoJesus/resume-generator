<script lang="ts">
	import type { CompiledPreview } from '$lib/pdf-compiler';

	let { preview }: { preview: CompiledPreview } = $props();
	let pageSvgs = $state<string[]>([]);
	let pageIndex = $state(0);

	function splitPages({ svg, pages }: CompiledPreview): string[] {
		if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return [];

		// The renderer's inline script contains HTML entities such as &nbsp;, which
		// are valid in the browser but not in a standalone XML document.
		const document = new DOMParser().parseFromString(svg, 'text/html');
		const root = document.querySelector('svg');
		if (!root) return [];
		const renderedPages = Array.from(root.children).filter((child) => child.classList.contains('typst-page'));
		if (renderedPages.length !== pages.length) return [];

		const shared = Array.from(root.children).filter(
			(child) => !child.classList.contains('typst-page') && child.tagName.toLowerCase() !== 'script',
		);
		const serializer = new XMLSerializer();

		return renderedPages.map((renderedPage, index) => {
			const page = pages[index];
			const pageRoot = root.cloneNode(false) as SVGSVGElement;
			pageRoot.setAttribute('viewBox', `0 0 ${page.width} ${page.height}`);
			pageRoot.setAttribute('width', String(page.width));
			pageRoot.setAttribute('height', String(page.height));
			pageRoot.setAttribute('data-width', String(page.width));
			pageRoot.setAttribute('data-height', String(page.height));

			for (const node of shared) pageRoot.appendChild(node.cloneNode(true));
			const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			background.setAttribute('width', String(page.width));
			background.setAttribute('height', String(page.height));
			background.setAttribute('fill', 'white');
			pageRoot.appendChild(background);
			const pageContent = renderedPage.cloneNode(true) as SVGElement;
			const transform = renderedPage.getAttribute('transform') ?? '';
			const horizontalOffset = transform.match(/translate\(\s*([^,\s)]+)/)?.[1] ?? '0';
			pageContent.setAttribute('transform', `translate(${horizontalOffset}, 0)`);
			pageRoot.appendChild(pageContent);

			return serializer.serializeToString(pageRoot);
		});
	}

	$effect(() => {
		pageSvgs = splitPages(preview);
		pageIndex = 0;
	});
</script>

{#if pageSvgs.length > 0 && pageSvgs.length === preview.pages.length}
	<div
		class="flex h-full min-h-0 w-full flex-col items-center gap-3"
		aria-label={`${pageSvgs.length}-page resume preview`}
	>
		{#if pageSvgs.length > 1}
			<nav class="flex w-full max-w-[510px] items-center justify-between gap-3" aria-label="Preview pages">
				<button
					class="secondary px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => (pageIndex -= 1)}
					disabled={pageIndex === 0}
					aria-label="Previous preview page">← Previous</button
				>
				<span class="text-sm font-medium text-white" aria-live="polite">
					Page {pageIndex + 1} of {pageSvgs.length}
				</span>
				<button
					class="secondary px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => (pageIndex += 1)}
					disabled={pageIndex === pageSvgs.length - 1}
					aria-label="Next preview page">Next →</button
				>
			</nav>
		{/if}
		<figure
			class="m-0 grid min-h-0 w-full flex-1 place-items-center overflow-hidden"
			aria-label={`Resume page ${pageIndex + 1}`}
		>
			<div class="resume-page h-full w-full overflow-hidden">
				{@html pageSvgs[pageIndex]}
			</div>
		</figure>
	</div>
{:else}
	<div class="resume-page grid h-full w-full place-items-center overflow-hidden">
		{@html preview.svg}
	</div>
{/if}

<style>
	.resume-page :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		max-width: 510px;
		margin: 0 auto;
	}
</style>
