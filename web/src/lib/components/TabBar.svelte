<script lang="ts">
	let { tabs, activeTab = $bindable() }: { tabs: { id: string; label: string }[]; activeTab: string } = $props();
</script>

<div class="flex flex-wrap gap-2 mb-6 border-b pb-4">
	{#each tabs as tab}
		<button
			class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {activeTab === tab.id
				? 'bg-blue-600 text-white'
				: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
			onclick={() => (activeTab = tab.id)}>{tab.label}</button
		>
	{/each}
</div>
