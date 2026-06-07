<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import EntryCard from '../EntryCard.svelte';
	import DateRange from '../DateRange.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addLeadership() {
		data.leadership = [
			...data.leadership,
			{
				id: generateId(),
				title: '',
				organization: '',
				location: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [''],
			},
		];
	}
	function removeLeadership(id: string) {
		data.leadership = data.leadership.filter((l) => l.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Leadership</h2>
		<button class="primary text-sm" onclick={addLeadership}>+ Add</button>
	</div>
	{#each data.leadership as lead, i}
		<EntryCard index={i} onRemove={() => removeLeadership(lead.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div><label>Title</label><input type="text" bind:value={lead.title} placeholder="Team Lead" /></div>
				<div>
					<label>Organization</label><input
						type="text"
						bind:value={lead.organization}
						placeholder="Organization Name"
					/>
				</div>
				<div class="md:col-span-2">
					<label>Location</label><input type="text" bind:value={lead.location} placeholder="City, State" />
				</div>
				<DateRange
					bind:startDate={lead.startDate}
					bind:endDate={lead.endDate}
					bind:isPresent={lead.isPresent}
					presentLabel="Currently active"
				/>
			</div>
			<BulletEditor
				bind:bullets={lead.bullets}
				label="Responsibilities"
				placeholder="Describe your leadership responsibilities..."
			/>
		</EntryCard>
	{/each}
	{#if data.leadership.length === 0}<p class="text-gray-500 text-center py-8">No leadership roles added yet.</p>{/if}
</div>
