<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import EntryCard from '../EntryCard.svelte';
	import DateRange from '../DateRange.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addEducation() {
		data.education = [
			...data.education,
			{
				id: generateId(),
				institution: '',
				location: '',
				degree: '',
				major: '',
				startDate: '',
				endDate: '',
				isPresent: false,
				bullets: [''],
			},
		];
	}
	function removeEducation(id: string) {
		data.education = data.education.filter((e) => e.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Education</h2>
		<button class="primary text-sm" onclick={addEducation}>+ Add</button>
	</div>
	{#each data.education as edu, i}
		<EntryCard index={i} onRemove={() => removeEducation(edu.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label>Institution</label><input type="text" bind:value={edu.institution} placeholder="University Name" />
				</div>
				<div><label>Location</label><input type="text" bind:value={edu.location} placeholder="City, State" /></div>
				<div><label>Degree</label><input type="text" bind:value={edu.degree} placeholder="Bachelor of Sciences" /></div>
				<div><label>Major</label><input type="text" bind:value={edu.major} placeholder="Computer Science" /></div>
				<DateRange
					bind:startDate={edu.startDate}
					bind:endDate={edu.endDate}
					bind:isPresent={edu.isPresent}
					endLabel="End Date (Expected)"
					presentLabel="Currently studying"
				/>
			</div>
			<BulletEditor bind:bullets={edu.bullets} label="Honors/GPA" placeholder="Relevant coursework, honors, GPA..." />
		</EntryCard>
	{/each}
	{#if data.education.length === 0}<p class="text-gray-500 text-center py-8">No education added yet.</p>{/if}
</div>
