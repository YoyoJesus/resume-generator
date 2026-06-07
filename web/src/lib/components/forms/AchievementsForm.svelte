<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { generateId } from '$lib/resume-utils';
	import { aiFilled, clearHighlight } from '$lib/ai-highlight';

	let { data }: { data: ResumeData } = $props();

	function addAchievement() {
		data.achievements = [...data.achievements, { id: generateId(), title: '', date: '', description: '' }];
	}
	function removeAchievement(id: string) {
		data.achievements = data.achievements.filter((a) => a.id !== id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Achievements / Certifications</h2>
		<button class="primary text-sm" onclick={addAchievement}>+ Add</button>
	</div>
	{#each data.achievements as achievement, i}
		<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
			<div class="flex justify-between items-start">
				<div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<label>Title</label><input
							type="text"
							bind:value={achievement.title}
							placeholder="AWS Certified Developer"
							class:ai-filled={aiFilled.has(`achievements.${i}.title`)}
							oninput={() => clearHighlight(`achievements.${i}.title`)}
						/>
					</div>
					<div>
						<label>Date</label><input
							type="month"
							bind:value={achievement.date}
							class:ai-filled={aiFilled.has(`achievements.${i}.date`)}
							oninput={() => clearHighlight(`achievements.${i}.date`)}
						/>
					</div>
				</div>
				<button class="danger text-sm px-2 py-1 ml-2" onclick={() => removeAchievement(achievement.id)}>X</button>
			</div>
			<div>
				<label>Description</label>
				<textarea
					bind:value={achievement.description}
					rows="2"
					placeholder="Brief description of the achievement or certification..."
					class:ai-filled={aiFilled.has(`achievements.${i}.description`)}
					oninput={() => clearHighlight(`achievements.${i}.description`)}
				></textarea>
			</div>
		</div>
	{/each}
	{#if data.achievements.length === 0}<p class="text-gray-500 text-center py-8">No achievements added yet.</p>{/if}
</div>
