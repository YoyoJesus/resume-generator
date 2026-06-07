<script lang="ts">
	import type { ResumeData } from '$lib/types';

	let { data }: { data: ResumeData } = $props();
</script>

<div class="space-y-4">
	<h2 class="text-lg font-semibold">Personal Information</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div><label>Full Name</label><input type="text" bind:value={data.personalInfo.name} placeholder="John Doe" /></div>
		<div>
			<label>Email</label><input type="email" bind:value={data.personalInfo.email} placeholder="john@example.com" />
		</div>
		<div>
			<label>Phone</label><input type="tel" bind:value={data.personalInfo.phone} placeholder="(555) 123-4567" />
		</div>
		<div>
			<label>Website</label><input type="text" bind:value={data.personalInfo.website} placeholder="johndoe.com" />
		</div>
		<div>
			<label>LinkedIn Username</label><input
				type="text"
				bind:value={data.personalInfo.linkedin}
				placeholder="johndoe"
			/>
		</div>
		<div>
			<label>GitHub Username</label><input type="text" bind:value={data.personalInfo.github} placeholder="johndoe" />
		</div>
	</div>
</div>
