<script lang="ts">
	let {
		startDate = $bindable(),
		endDate = $bindable(),
		isPresent = $bindable(),
		endLabel = 'End Date',
		presentLabel = 'Currently active',
	}: {
		startDate: string;
		endDate: string;
		isPresent: boolean;
		endLabel?: string;
		presentLabel?: string;
	} = $props();
</script>

<div><label>Start Date</label><input type="month" bind:value={startDate} /></div>
<div>
	<label>{endLabel}</label>
	<input type="month" bind:value={endDate} disabled={isPresent} />
	<label class="flex items-center gap-2 mt-2 cursor-pointer select-none">
		<input type="checkbox" bind:checked={isPresent} class="w-4 h-4 rounded" />
		<span class="text-sm text-gray-600">{presentLabel}</span>
	</label>
</div>
