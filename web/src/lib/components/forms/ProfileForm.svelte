<script lang="ts">
	import type { ResumeData } from '$lib/types';

	let { data }: { data: ResumeData } = $props();
</script>

<div class="space-y-4">
	<h2 class="text-lg font-semibold">Profile Summary</h2>
	<textarea
		bind:value={data.profile.summary}
		rows="5"
		placeholder="A brief summary of your background, skills, and career objectives..."
	></textarea>
</div>
