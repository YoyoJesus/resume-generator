<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import EntryCard from '../EntryCard.svelte';
	import DateRange from '../DateRange.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addWorkExperience() {
		data.workExperience = [
			...data.workExperience,
			{
				id: generateId(),
				title: '',
				company: '',
				location: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [''],
			},
		];
	}
	function removeWorkExperience(id: string) {
		data.workExperience = data.workExperience.filter((w) => w.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Work Experience</h2>
		<button class="primary text-sm" onclick={addWorkExperience}>+ Add</button>
	</div>
	{#each data.workExperience as work, i}
		<EntryCard index={i} onRemove={() => removeWorkExperience(work.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div><label>Job Title</label><input type="text" bind:value={work.title} placeholder="Software Engineer" /></div>
				<div><label>Company</label><input type="text" bind:value={work.company} placeholder="Company Name" /></div>
				<div class="md:col-span-2">
					<label>Location</label><input type="text" bind:value={work.location} placeholder="City, State" />
				</div>
				<DateRange
					bind:startDate={work.startDate}
					bind:endDate={work.endDate}
					bind:isPresent={work.isPresent}
					presentLabel="Currently working here"
				/>
			</div>
			<BulletEditor
				bind:bullets={work.bullets}
				label="Responsibilities"
				placeholder="Describe your responsibilities and achievements..."
			/>
		</EntryCard>
	{/each}
	{#if data.workExperience.length === 0}<p class="text-gray-500 text-center py-8">No experience added yet.</p>{/if}
</div>
