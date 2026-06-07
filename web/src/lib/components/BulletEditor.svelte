<script lang="ts">
	let {
		bullets = $bindable(),
		label,
		placeholder = '',
	}: { bullets: string[]; label: string; placeholder?: string } = $props();

	function addBullet() {
		bullets = [...bullets, ''];
	}
	function removeBullet(index: number) {
		bullets = bullets.filter((_, i) => i !== index);
	}
</script>

<div>
	<div class="flex items-center justify-between mb-2">
		<label class="mb-0">{label}</label>
		<button class="secondary text-xs px-2 py-1" onclick={addBullet}>+ Add</button>
	</div>
	{#each bullets as _, bi}
		<div class="flex gap-2 mb-2">
			<input type="text" bind:value={bullets[bi]} {placeholder} class="flex-1" />
			{#if bullets.length > 1}<button class="danger text-xs px-2" onclick={() => removeBullet(bi)}>X</button>{/if}
		</div>
	{/each}
</div>
