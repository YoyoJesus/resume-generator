<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import EntryCard from '../EntryCard.svelte';
	import BulletEditor from '../BulletEditor.svelte';

	let { data }: { data: ResumeData } = $props();

	function addProject() {
		data.projects = [...data.projects, { id: generateId(), name: '', stack: '', url: '', award: '', bullets: [''] }];
	}
	function removeProject(id: string) {
		data.projects = data.projects.filter((p) => p.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Projects</h2>
		<button class="primary text-sm" onclick={addProject}>+ Add</button>
	</div>
	{#each data.projects as project, i}
		<EntryCard index={i} onRemove={() => removeProject(project.id)}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div><label>Project Name</label><input type="text" bind:value={project.name} placeholder="My Project" /></div>
				<div>
					<label>Tech Stack</label><input
						type="text"
						bind:value={project.stack}
						placeholder="React, Node.js, PostgreSQL"
					/>
				</div>
				<div>
					<label>Award (optional)</label><input type="text" bind:value={project.award} placeholder="Hackathon Winner" />
				</div>
				<div>
					<label>Project URL</label><input type="text" bind:value={project.url} placeholder="https://github.com/..." />
				</div>
			</div>
			<BulletEditor bind:bullets={project.bullets} label="Description" placeholder="Describe what you built..." />
		</EntryCard>
	{/each}
	{#if data.projects.length === 0}<p class="text-gray-500 text-center py-8">No projects added yet.</p>{/if}
</div>
