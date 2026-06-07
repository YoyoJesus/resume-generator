<script lang="ts">
	import { onMount } from 'svelte';
	import { resumeStore } from '$lib/store';
	import { generateTypstCode } from '$lib/typst-generator';
	import { initCompiler, compileToPdf, compileToSvg, downloadPdf } from '$lib/pdf-compiler';
	import type { ResumeData } from '$lib/types';
	import { defaultResumeData } from '$lib/types';
	import { estimateOverOnePage } from '$lib/resume-utils';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import AppFooter from '$lib/components/AppFooter.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import PreviewPanel from '$lib/components/PreviewPanel.svelte';
	import PersonalForm from '$lib/components/forms/PersonalForm.svelte';
	import ProfileForm from '$lib/components/forms/ProfileForm.svelte';
	import EducationForm from '$lib/components/forms/EducationForm.svelte';
	import ProjectsForm from '$lib/components/forms/ProjectsForm.svelte';
	import ExperienceForm from '$lib/components/forms/ExperienceForm.svelte';
	import LeadershipForm from '$lib/components/forms/LeadershipForm.svelte';
	import SkillsForm from '$lib/components/forms/SkillsForm.svelte';
	import AchievementsForm from '$lib/components/forms/AchievementsForm.svelte';
	import LayoutForm from '$lib/components/forms/LayoutForm.svelte';
	import FontsForm from '$lib/components/forms/FontsForm.svelte';
	import ColorsForm from '$lib/components/forms/ColorsForm.svelte';

	let data: ResumeData = $state(structuredClone(defaultResumeData));
	let activeTab = $state('personal');
	let showCode = $state(false);
	let isCompiling = $state(false);
	let compileError = $state<string | null>(null);
	let typstCode = $derived(generateTypstCode(data));
	let svgPreview = $state<string>('');
	let isPreviewLoading = $state(false);
	let previewDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	let isOverOnePage = $derived(estimateOverOnePage(data));

	async function updatePreview(code: string) {
		isPreviewLoading = true;
		try {
			svgPreview = await compileToSvg(code);
		} catch (err) {
			console.error('SVG preview failed:', err);
		} finally {
			isPreviewLoading = false;
		}
	}

	$effect(() => {
		const code = typstCode;
		clearTimeout(previewDebounceTimer);
		previewDebounceTimer = setTimeout(() => updatePreview(code), 300);
		return () => clearTimeout(previewDebounceTimer);
	});

	onMount(() => {
		resumeStore.loadFromStorage();
		const unsub = resumeStore.subscribe((val) => {
			data = val;
		});
		initCompiler()
			.then(() => updatePreview(typstCode))
			.catch(console.error);
		return unsub;
	});

	$effect(() => {
		resumeStore.set(data);
		resumeStore.saveToStorage(data);
	});

	async function downloadPdfFile() {
		isCompiling = true;
		compileError = null;
		try {
			const pdfData = await compileToPdf(typstCode);
			downloadPdf(pdfData, `${data.personalInfo.name || 'resume'}.pdf`);
		} catch (err) {
			console.error('PDF compilation failed:', err);
			compileError = err instanceof Error ? err.message : 'Compilation failed';
		} finally {
			isCompiling = false;
		}
	}

	const tabs = [
		{ id: 'personal', label: 'Personal' },
		{ id: 'profile', label: 'Profile' },
		{ id: 'education', label: 'Education' },
		{ id: 'projects', label: 'Projects' },
		{ id: 'experience', label: 'Experience' },
		{ id: 'leadership', label: 'Leadership' },
		{ id: 'skills', label: 'Skills' },
		{ id: 'achievements', label: 'Achievements' },
		{ id: 'layout', label: 'Layout' },
		{ id: 'fonts', label: 'Fonts' },
		{ id: 'colors', label: 'Colors' },
	];
</script>

<div class="min-h-screen bg-gray-100 flex flex-col">
	<AppHeader bind:showCode {isCompiling} {compileError} {isOverOnePage} onDownload={downloadPdfFile} />

	<main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Form Panel -->
			<div class="bg-white rounded-lg shadow p-6 overflow-auto max-h-[calc(100vh-10rem)]">
				<TabBar {tabs} bind:activeTab />

				{#if activeTab === 'personal'}
					<PersonalForm {data} />
				{:else if activeTab === 'profile'}
					<ProfileForm {data} />
				{:else if activeTab === 'education'}
					<EducationForm {data} />
				{:else if activeTab === 'projects'}
					<ProjectsForm {data} />
				{:else if activeTab === 'experience'}
					<ExperienceForm {data} />
				{:else if activeTab === 'leadership'}
					<LeadershipForm {data} />
				{:else if activeTab === 'skills'}
					<SkillsForm {data} />
				{:else if activeTab === 'achievements'}
					<AchievementsForm {data} />
				{:else if activeTab === 'layout'}
					<LayoutForm {data} />
				{:else if activeTab === 'fonts'}
					<FontsForm {data} />
				{:else if activeTab === 'colors'}
					<ColorsForm {data} />
				{/if}
			</div>

			<!-- Preview Panel -->
			<PreviewPanel {showCode} {typstCode} {svgPreview} {isPreviewLoading} />
		</div>
	</main>

	<AppFooter />
</div>
