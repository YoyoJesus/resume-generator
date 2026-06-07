<script lang="ts">
	import type { Snippet } from 'svelte';

	let { index, onRemove, children }: { index: number; onRemove: () => void; children: Snippet } = $props();
</script>

<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
	<div class="flex justify-between items-start">
		<span class="text-sm font-medium text-gray-500">#{index + 1}</span>
		<button class="danger text-sm px-2 py-1" onclick={onRemove}>Remove</button>
	</div>
	{@render children()}
</div>
