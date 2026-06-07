<script lang="ts">
	import type { ResumeData } from '$lib/types';

	let { data }: { data: ResumeData } = $props();
</script>

<div class="space-y-4">
	<h2 class="text-lg font-semibold">Color Settings</h2>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label>Header Color</label><input
				type="color"
				bind:value={data.colors.headColor}
				class="w-full h-10 p-1 rounded cursor-pointer"
			/>
		</div>
		<div>
			<label>Text Color</label><input
				type="color"
				bind:value={data.colors.textColor}
				class="w-full h-10 p-1 rounded cursor-pointer"
			/>
		</div>
		<div>
			<label>Accent Color</label><input
				type="color"
				bind:value={data.colors.accentColor}
				class="w-full h-10 p-1 rounded cursor-pointer"
			/>
		</div>
		<div>
			<label>Link Color</label><input
				type="color"
				bind:value={data.colors.linkColor}
				class="w-full h-10 p-1 rounded cursor-pointer"
			/>
		</div>
	</div>
</div>
