<script lang="ts">
	import type { ResumeData } from '$lib/types';
	import { defaultFontSettings } from '$lib/types';

	let { data }: { data: ResumeData } = $props();

	function resetFontSettings() {
		data.fonts = { ...defaultFontSettings };
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Font Size Settings</h2>
		<button class="secondary text-sm" onclick={resetFontSettings}>Reset to Default</button>
	</div>
	<p class="text-sm text-gray-600">Adjust font sizes in points (pt). Changes apply to the PDF output.</p>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label>Base Text Size</label>
			<div class="flex items-center gap-3">
				<input type="range" min="6" max="14" step="0.1" bind:value={data.fonts.baseSize} class="flex-1" />
				<span class="text-sm font-mono w-16 text-right">{data.fonts.baseSize}pt</span>
			</div>
			<p class="text-xs text-gray-500 mt-1">Body text, bullet points</p>
		</div>
		<div>
			<label>Name Size</label>
			<div class="flex items-center gap-3">
				<input type="range" min="14" max="32" step="0.1" bind:value={data.fonts.nameSize} class="flex-1" />
				<span class="text-sm font-mono w-16 text-right">{data.fonts.nameSize}pt</span>
			</div>
			<p class="text-xs text-gray-500 mt-1">Your name at the top</p>
		</div>
		<div>
			<label>Section Heading Size</label>
			<div class="flex items-center gap-3">
				<input type="range" min="10" max="24" step="0.1" bind:value={data.fonts.headingSize} class="flex-1" />
				<span class="text-sm font-mono w-16 text-right">{data.fonts.headingSize}pt</span>
			</div>
			<p class="text-xs text-gray-500 mt-1">Education, Experience, etc.</p>
		</div>
		<div>
			<label>Contact Info Size</label>
			<div class="flex items-center gap-3">
				<input type="range" min="7" max="16" step="0.1" bind:value={data.fonts.contactSize} class="flex-1" />
				<span class="text-sm font-mono w-16 text-right">{data.fonts.contactSize}pt</span>
			</div>
			<p class="text-xs text-gray-500 mt-1">Email, phone, links</p>
		</div>
	</div>
</div>
