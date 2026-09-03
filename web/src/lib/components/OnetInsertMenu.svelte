<script lang="ts">
	// Expands inline beneath the item being inserted. Inline rather than a floating
	// popover so it can't be clipped by the drawer's scroll container.
	let {
		heading,
		targets,
		allowNew = false,
		newPlaceholder = 'New category name',
		emptyMessage = 'Nothing to insert into yet.',
		onPick,
		onCreate,
	}: {
		// Says what the pick will actually do, e.g. "Add as a bullet point to:".
		heading: string;
		targets: { id: string; label: string }[];
		allowNew?: boolean;
		newPlaceholder?: string;
		emptyMessage?: string;
		onPick: (id: string) => void;
		onCreate?: (name: string) => void;
	} = $props();

	let newName = $state('');

	function create() {
		const name = newName.trim();
		if (!name || !onCreate) return;
		onCreate(name);
		newName = '';
	}
</script>

<div class="mt-2 rounded border border-gray-300 bg-gray-50 p-2 space-y-1">
	<p class="text-xs font-medium text-gray-600 px-1">{heading}</p>

	{#each targets as target (target.id)}
		<button
			class="block w-full text-left text-xs font-normal px-2 py-1 rounded bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300"
			onclick={() => onPick(target.id)}
		>
			{target.label}
		</button>
	{/each}

	{#if targets.length === 0 && !allowNew}
		<p class="text-xs text-gray-500 px-1 py-1">{emptyMessage}</p>
	{/if}

	{#if allowNew}
		<div class="flex gap-1 pt-1">
			<input
				type="text"
				bind:value={newName}
				placeholder={newPlaceholder}
				class="text-xs !py-1"
				onkeydown={(e) => e.key === 'Enter' && create()}
			/>
			<button class="primary text-xs px-2 py-1 shrink-0" onclick={create} disabled={!newName.trim()}>Create</button>
		</div>
	{/if}
</div>
