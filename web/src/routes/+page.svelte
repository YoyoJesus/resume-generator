<script lang="ts">
	import { onMount } from 'svelte';
	import { resumeStore } from '$lib/store';
	import { generateTypstCode } from '$lib/typst-generator';
	import { initCompiler, compileToPdf, downloadPdf } from '$lib/pdf-compiler';
	import type { ResumeData, WorkExperience, Project, Education, Leadership, Achievement, SkillCategory, SectionId } from '$lib/types';
	import { defaultResumeData, sectionLabels, defaultSectionOrder, defaultFontSettings } from '$lib/types';

	let data: ResumeData = $state(structuredClone(defaultResumeData));
	let activeTab = $state('personal');
	let showCode = $state(false);
	let isCompiling = $state(false);
	let compileError = $state<string | null>(null);
	let typstCode = $derived(generateTypstCode(data));
	let previewRef = $state<HTMLDivElement | null>(null);

	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	function formatDate(dateStr: string | undefined): string {
		if (!dateStr) return '';
		const [year, month] = dateStr.split('-');
		const monthName = MONTHS[parseInt(month) - 1];
		return `${monthName} ${year}`;
	}

	// Estimate if resume exceeds one page (rough heuristic based on content)
	let isOverOnePage = $derived(() => {
		let lines = 0;
		lines += data.profile.summary ? 3 : 0;
		lines += data.education.length * 4;
		data.education.forEach(e => lines += e.bullets.filter(b => b).length);
		lines += data.projects.length * 3;
		data.projects.forEach(p => lines += p.bullets.filter(b => b).length);
		lines += data.workExperience.length * 4;
		data.workExperience.forEach(w => lines += w.bullets.filter(b => b).length);
		lines += data.leadership.length * 4;
		data.leadership.forEach(l => lines += l.bullets.filter(b => b).length);
		lines += data.skills.length * 1;
		lines += data.achievements.length * 3;
		return lines > 45; // Rough estimate for one page
	});

	onMount(() => {
		resumeStore.loadFromStorage();
		const unsub = resumeStore.subscribe(val => {
			data = val;
		});
		initCompiler().catch(console.error);
		return unsub;
	});

	function saveData() {
		resumeStore.set(data);
		resumeStore.saveToStorage(data);
	}

	function generateId(): string {
		return Math.random().toString(36).substring(2, 9);
	}

	// Education
	function addEducation() {
		data.education = [...data.education, {
			id: generateId(), institution: '', location: '', degree: '', major: '',
			startDate: '', endDate: '', isPresent: false, bullets: ['']
		}];
	}
	function removeEducation(id: string) { data.education = data.education.filter(e => e.id !== id); }
	function addEducationBullet(edu: Education) { edu.bullets = [...edu.bullets, '']; }
	function removeEducationBullet(edu: Education, index: number) { edu.bullets = edu.bullets.filter((_, i) => i !== index); }

	// Projects
	function addProject() {
		data.projects = [...data.projects, {
			id: generateId(), name: '', stack: '', url: '', award: '', bullets: ['']
		}];
	}
	function removeProject(id: string) { data.projects = data.projects.filter(p => p.id !== id); }
	function addProjectBullet(project: Project) { project.bullets = [...project.bullets, '']; }
	function removeProjectBullet(project: Project, index: number) { project.bullets = project.bullets.filter((_, i) => i !== index); }

	// Work Experience
	function addWorkExperience() {
		data.workExperience = [...data.workExperience, {
			id: generateId(), title: '', company: '', location: '',
			startDate: '', endDate: '', isPresent: false, bullets: ['']
		}];
	}
	function removeWorkExperience(id: string) { data.workExperience = data.workExperience.filter(w => w.id !== id); }
	function addWorkBullet(work: WorkExperience) { work.bullets = [...work.bullets, '']; }
	function removeWorkBullet(work: WorkExperience, index: number) { work.bullets = work.bullets.filter((_, i) => i !== index); }

	// Leadership
	function addLeadership() {
		data.leadership = [...data.leadership, {
			id: generateId(), title: '', organization: '', location: '',
			startDate: '', endDate: '', isPresent: false, bullets: ['']
		}];
	}
	function removeLeadership(id: string) { data.leadership = data.leadership.filter(l => l.id !== id); }
	function addLeadershipBullet(lead: Leadership) { lead.bullets = [...lead.bullets, '']; }
	function removeLeadershipBullet(lead: Leadership, index: number) { lead.bullets = lead.bullets.filter((_, i) => i !== index); }

	// Skills
	function addSkillCategory() {
		data.skills = [...data.skills, { id: generateId(), category: '', skills: '' }];
	}
	function removeSkillCategory(id: string) { data.skills = data.skills.filter(s => s.id !== id); }

	// Achievements
	function addAchievement() {
		data.achievements = [...data.achievements, { id: generateId(), title: '', date: '', description: '' }];
	}
	function removeAchievement(id: string) { data.achievements = data.achievements.filter(a => a.id !== id); }

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

	function copyToClipboard() { navigator.clipboard.writeText(typstCode); }

	// Section reordering
	function moveSection(index: number, direction: 'up' | 'down') {
		const newOrder = [...data.sectionOrder];
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= newOrder.length) return;
		[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
		data.sectionOrder = newOrder;
	}

	function resetSectionOrder() {
		data.sectionOrder = [...defaultSectionOrder];
	}

	function resetFontSettings() {
		data.fonts = { ...defaultFontSettings };
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
		{ id: 'colors', label: 'Colors' }
	];
</script>

<div class="min-h-screen bg-gray-100">
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between flex-wrap gap-2">
				<h1 class="text-2xl font-bold text-gray-900">Resume Builder</h1>
				<div class="flex gap-2">
					<button class="secondary" onclick={saveData}>Save</button>
					<button class="secondary" onclick={() => showCode = !showCode}>
						{showCode ? 'Preview' : 'Typst'}
					</button>
					<button class="primary" onclick={downloadPdfFile} disabled={isCompiling}>
						{isCompiling ? 'Generating...' : 'Download PDF'}
					</button>
				</div>
			</div>
			{#if compileError}
				<div class="mt-2 text-red-600 text-sm">{compileError}</div>
			{/if}
			{#if isOverOnePage()}
				<div class="mt-2 px-3 py-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded text-sm">
					Warning: Your resume may exceed one page. Consider removing some content.
				</div>
			{/if}
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Form Panel -->
			<div class="bg-white rounded-lg shadow p-6 overflow-auto max-h-[calc(100vh-10rem)]">
				<div class="flex flex-wrap gap-2 mb-6 border-b pb-4">
					{#each tabs as tab}
						<button
							class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							onclick={() => activeTab = tab.id}
						>{tab.label}</button>
					{/each}
				</div>

				<!-- Personal Info -->
				{#if activeTab === 'personal'}
					<div class="space-y-4">
						<h2 class="text-lg font-semibold">Personal Information</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div><label>Full Name</label><input type="text" bind:value={data.personalInfo.name} placeholder="John Doe" /></div>
							<div><label>Email</label><input type="email" bind:value={data.personalInfo.email} placeholder="john@example.com" /></div>
							<div><label>Phone</label><input type="tel" bind:value={data.personalInfo.phone} placeholder="(555) 123-4567" /></div>
							<div><label>Website</label><input type="text" bind:value={data.personalInfo.website} placeholder="johndoe.com" /></div>
							<div><label>LinkedIn Username</label><input type="text" bind:value={data.personalInfo.linkedin} placeholder="johndoe" /></div>
							<div><label>GitHub Username</label><input type="text" bind:value={data.personalInfo.github} placeholder="johndoe" /></div>
						</div>
					</div>
				{/if}

				<!-- Profile -->
				{#if activeTab === 'profile'}
					<div class="space-y-4">
						<h2 class="text-lg font-semibold">Profile Summary</h2>
						<textarea bind:value={data.profile.summary} rows="5" placeholder="A brief summary of your background, skills, and career objectives..."></textarea>
					</div>
				{/if}

				<!-- Education -->
				{#if activeTab === 'education'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Education</h2>
							<button class="primary text-sm" onclick={addEducation}>+ Add</button>
						</div>
						{#each data.education as edu, i}
							<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
								<div class="flex justify-between items-start">
									<span class="text-sm font-medium text-gray-500">#{i + 1}</span>
									<button class="danger text-sm px-2 py-1" onclick={() => removeEducation(edu.id)}>Remove</button>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div><label>Institution</label><input type="text" bind:value={edu.institution} placeholder="University Name" /></div>
									<div><label>Location</label><input type="text" bind:value={edu.location} placeholder="City, State" /></div>
									<div><label>Degree</label><input type="text" bind:value={edu.degree} placeholder="Bachelor of Sciences" /></div>
									<div><label>Major</label><input type="text" bind:value={edu.major} placeholder="Computer Science" /></div>
									<div><label>Start Date</label><input type="month" bind:value={edu.startDate} /></div>
									<div><label>End Date (Expected)</label><input type="month" bind:value={edu.endDate} /></div>
								</div>
								<div>
									<div class="flex items-center justify-between mb-2">
										<label class="mb-0">Honors/GPA</label>
										<button class="secondary text-xs px-2 py-1" onclick={() => addEducationBullet(edu)}>+ Add</button>
									</div>
									{#each edu.bullets as _, bi}
										<div class="flex gap-2 mb-2">
											<input type="text" bind:value={edu.bullets[bi]} placeholder="Relevant coursework, honors, GPA..." class="flex-1" />
											{#if edu.bullets.length > 1}<button class="danger text-xs px-2" onclick={() => removeEducationBullet(edu, bi)}>X</button>{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
						{#if data.education.length === 0}<p class="text-gray-500 text-center py-8">No education added yet.</p>{/if}
					</div>
				{/if}

				<!-- Projects -->
				{#if activeTab === 'projects'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Projects</h2>
							<button class="primary text-sm" onclick={addProject}>+ Add</button>
						</div>
						{#each data.projects as project, i}
							<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
								<div class="flex justify-between items-start">
									<span class="text-sm font-medium text-gray-500">#{i + 1}</span>
									<button class="danger text-sm px-2 py-1" onclick={() => removeProject(project.id)}>Remove</button>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div><label>Project Name</label><input type="text" bind:value={project.name} placeholder="My Project" /></div>
									<div><label>Tech Stack</label><input type="text" bind:value={project.stack} placeholder="React, Node.js, PostgreSQL" /></div>
									<div><label>Award (optional)</label><input type="text" bind:value={project.award} placeholder="Hackathon Winner" /></div>
									<div><label>Project URL</label><input type="text" bind:value={project.url} placeholder="https://github.com/..." /></div>
								</div>
								<div>
									<div class="flex items-center justify-between mb-2">
										<label class="mb-0">Description</label>
										<button class="secondary text-xs px-2 py-1" onclick={() => addProjectBullet(project)}>+ Add</button>
									</div>
									{#each project.bullets as _, bi}
										<div class="flex gap-2 mb-2">
											<input type="text" bind:value={project.bullets[bi]} placeholder="Describe what you built..." class="flex-1" />
											{#if project.bullets.length > 1}<button class="danger text-xs px-2" onclick={() => removeProjectBullet(project, bi)}>X</button>{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
						{#if data.projects.length === 0}<p class="text-gray-500 text-center py-8">No projects added yet.</p>{/if}
					</div>
				{/if}

				<!-- Experience -->
				{#if activeTab === 'experience'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Work Experience</h2>
							<button class="primary text-sm" onclick={addWorkExperience}>+ Add</button>
						</div>
						{#each data.workExperience as work, i}
							<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
								<div class="flex justify-between items-start">
									<span class="text-sm font-medium text-gray-500">#{i + 1}</span>
									<button class="danger text-sm px-2 py-1" onclick={() => removeWorkExperience(work.id)}>Remove</button>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div><label>Job Title</label><input type="text" bind:value={work.title} placeholder="Software Engineer" /></div>
									<div><label>Company</label><input type="text" bind:value={work.company} placeholder="Company Name" /></div>
									<div class="md:col-span-2"><label>Location</label><input type="text" bind:value={work.location} placeholder="City, State" /></div>
									<div><label>Start Date</label><input type="month" bind:value={work.startDate} /></div>
									<div>
										<label>End Date</label>
										<input type="month" bind:value={work.endDate} disabled={work.isPresent} />
										<label class="flex items-center gap-2 mt-2 cursor-pointer select-none">
											<input type="checkbox" bind:checked={work.isPresent} class="w-4 h-4 rounded" />
											<span class="text-sm text-gray-600">Currently working here</span>
										</label>
									</div>
								</div>
								<div>
									<div class="flex items-center justify-between mb-2">
										<label class="mb-0">Responsibilities</label>
										<button class="secondary text-xs px-2 py-1" onclick={() => addWorkBullet(work)}>+ Add</button>
									</div>
									{#each work.bullets as _, bi}
										<div class="flex gap-2 mb-2">
											<input type="text" bind:value={work.bullets[bi]} placeholder="Describe your responsibilities and achievements..." class="flex-1" />
											{#if work.bullets.length > 1}<button class="danger text-xs px-2" onclick={() => removeWorkBullet(work, bi)}>X</button>{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
						{#if data.workExperience.length === 0}<p class="text-gray-500 text-center py-8">No experience added yet.</p>{/if}
					</div>
				{/if}

				<!-- Leadership -->
				{#if activeTab === 'leadership'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Leadership</h2>
							<button class="primary text-sm" onclick={addLeadership}>+ Add</button>
						</div>
						{#each data.leadership as lead, i}
							<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
								<div class="flex justify-between items-start">
									<span class="text-sm font-medium text-gray-500">#{i + 1}</span>
									<button class="danger text-sm px-2 py-1" onclick={() => removeLeadership(lead.id)}>Remove</button>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div><label>Title</label><input type="text" bind:value={lead.title} placeholder="Team Lead" /></div>
									<div><label>Organization</label><input type="text" bind:value={lead.organization} placeholder="Organization Name" /></div>
									<div class="md:col-span-2"><label>Location</label><input type="text" bind:value={lead.location} placeholder="City, State" /></div>
									<div><label>Start Date</label><input type="month" bind:value={lead.startDate} /></div>
									<div>
										<label>End Date</label>
										<input type="month" bind:value={lead.endDate} disabled={lead.isPresent} />
										<label class="flex items-center gap-2 mt-2 cursor-pointer select-none">
											<input type="checkbox" bind:checked={lead.isPresent} class="w-4 h-4 rounded" />
											<span class="text-sm text-gray-600">Currently active</span>
										</label>
									</div>
								</div>
								<div>
									<div class="flex items-center justify-between mb-2">
										<label class="mb-0">Responsibilities</label>
										<button class="secondary text-xs px-2 py-1" onclick={() => addLeadershipBullet(lead)}>+ Add</button>
									</div>
									{#each lead.bullets as _, bi}
										<div class="flex gap-2 mb-2">
											<input type="text" bind:value={lead.bullets[bi]} placeholder="Describe your leadership responsibilities..." class="flex-1" />
											{#if lead.bullets.length > 1}<button class="danger text-xs px-2" onclick={() => removeLeadershipBullet(lead, bi)}>X</button>{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
						{#if data.leadership.length === 0}<p class="text-gray-500 text-center py-8">No leadership roles added yet.</p>{/if}
					</div>
				{/if}

				<!-- Skills -->
				{#if activeTab === 'skills'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Skills</h2>
							<button class="primary text-sm" onclick={addSkillCategory}>+ Add</button>
						</div>
						{#each data.skills as skill}
							<div class="border rounded-lg p-4 bg-gray-50">
								<div class="flex gap-3 items-start">
									<div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
										<div><label>Category</label><input type="text" bind:value={skill.category} placeholder="Languages" /></div>
										<div><label>Skills</label><input type="text" bind:value={skill.skills} placeholder="Python, TypeScript, C++" /></div>
									</div>
									<button class="danger text-sm px-2 py-1" onclick={() => removeSkillCategory(skill.id)}>X</button>
								</div>
							</div>
						{/each}
						{#if data.skills.length === 0}<p class="text-gray-500 text-center py-8">No skills added yet.</p>{/if}
					</div>
				{/if}

				<!-- Achievements -->
				{#if activeTab === 'achievements'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Achievements / Certifications</h2>
							<button class="primary text-sm" onclick={addAchievement}>+ Add</button>
						</div>
						{#each data.achievements as achievement}
							<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
								<div class="flex justify-between items-start">
									<div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
										<div><label>Title</label><input type="text" bind:value={achievement.title} placeholder="AWS Certified Developer" /></div>
										<div><label>Date</label><input type="text" bind:value={achievement.date} placeholder="Jan 2024" /></div>
									</div>
									<button class="danger text-sm px-2 py-1 ml-2" onclick={() => removeAchievement(achievement.id)}>X</button>
								</div>
								<div>
									<label>Description</label>
									<textarea bind:value={achievement.description} rows="2" placeholder="Brief description of the achievement or certification..."></textarea>
								</div>
							</div>
						{/each}
						{#if data.achievements.length === 0}<p class="text-gray-500 text-center py-8">No achievements added yet.</p>{/if}
					</div>
				{/if}

				<!-- Layout -->
				{#if activeTab === 'layout'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Section Order</h2>
							<button class="secondary text-sm" onclick={resetSectionOrder}>Reset to Default</button>
						</div>
						<p class="text-sm text-gray-600">Drag sections or use the arrows to reorder how they appear in your resume.</p>
						<div class="space-y-2">
							{#each data.sectionOrder as sectionId, i}
								<div class="flex items-center gap-3 bg-gray-50 border rounded-lg p-3">
									<div class="flex flex-col gap-1">
										<button 
											class="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
											onclick={() => moveSection(i, 'up')}
											disabled={i === 0}
											aria-label="Move section up"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
										</button>
										<button 
											class="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
											onclick={() => moveSection(i, 'down')}
											disabled={i === data.sectionOrder.length - 1}
											aria-label="Move section down"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
										</button>
									</div>
									<span class="font-medium flex-1">{sectionLabels[sectionId]}</span>
									<span class="text-sm text-gray-400">#{i + 1}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Fonts -->
				{#if activeTab === 'fonts'}
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
				{/if}

				<!-- Colors -->
				{#if activeTab === 'colors'}
					<div class="space-y-4">
						<h2 class="text-lg font-semibold">Color Settings</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div><label>Header Color</label><input type="color" bind:value={data.colors.headColor} class="w-full h-10 p-1 rounded cursor-pointer" /></div>
							<div><label>Text Color</label><input type="color" bind:value={data.colors.textColor} class="w-full h-10 p-1 rounded cursor-pointer" /></div>
							<div><label>Accent Color</label><input type="color" bind:value={data.colors.accentColor} class="w-full h-10 p-1 rounded cursor-pointer" /></div>
							<div><label>Link Color</label><input type="color" bind:value={data.colors.linkColor} class="w-full h-10 p-1 rounded cursor-pointer" /></div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Preview Panel -->
			<div class="bg-gray-500 rounded-lg shadow p-4 flex flex-col items-center overflow-auto max-h-[calc(100vh-10rem)]">
				<h2 class="text-lg font-semibold mb-4 text-white">{showCode ? 'Typst Code' : 'Resume Preview (8.5" x 11")'}</h2>

				{#if showCode}
					<div class="relative w-full">
						<button class="absolute top-2 right-2 secondary text-xs" onclick={copyToClipboard}>Copy</button>
						<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[calc(100vh-16rem)] text-xs w-full"><code>{typstCode}</code></pre>
					</div>
				{:else}
					<!-- 8.5x11 aspect ratio container (11/8.5 = 1.294) -->
					<div
						bind:this={previewRef}
						class="bg-white shadow-lg overflow-auto"
						style="width: 100%; max-width: 510px; aspect-ratio: 8.5 / 11; font-family: Georgia, serif; font-size: {data.fonts.baseSize}px; color: {data.colors.textColor}; padding: 24px;"
					>
						<!-- Header -->
						<div class="text-center mb-2">
							<h1 class="font-bold uppercase" style="color: {data.colors.headColor}; font-size: {data.fonts.nameSize}px;">{data.personalInfo.name || 'Your Name'}</h1>
							<div class="flex flex-wrap justify-center gap-x-1" style="color: {data.colors.textColor}; font-size: {data.fonts.contactSize}px;">
								{#if data.personalInfo.email}<span style="color: {data.colors.linkColor}">{data.personalInfo.email}</span> |{/if}
								{#if data.personalInfo.website}<span style="color: {data.colors.linkColor}">{data.personalInfo.website}</span> |{/if}
								{#if data.personalInfo.linkedin}<span style="color: {data.colors.linkColor}">linkedin.com/in/{data.personalInfo.linkedin}</span> |{/if}
								{#if data.personalInfo.github}<span style="color: {data.colors.linkColor}">github.com/{data.personalInfo.github}</span> |{/if}
								{#if data.personalInfo.phone}<span>{data.personalInfo.phone}</span>{/if}
							</div>
						</div>

						<!-- Profile -->
						{#if data.profile.summary}
							<div class="mb-2">
								<h2 class="uppercase tracking-wider pb-0.5 mb-0.5 font-normal" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}; font-size: {data.fonts.headingSize}px;">Profile</h2>
								<p style="color: {data.colors.textColor}; line-height: 1.3;">{data.profile.summary}</p>
							</div>
						{/if}

						<!-- Education -->
						{#if data.education.length > 0}
							<div class="mb-2">
								<h2 class="uppercase tracking-wider pb-0.5 mb-0.5 font-normal" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}; font-size: {data.fonts.headingSize}px;">Education</h2>
								{#each data.education as edu}
									<div class="mb-1">
										<div class="flex justify-between"><span class="font-bold">{edu.institution}</span><span class="font-bold">{edu.location}</span></div>
										<div class="flex justify-between"><span>{edu.degree}, {edu.major}</span><span>{formatDate(edu.startDate)} - {formatDate(edu.endDate)}</span></div>
										<ul class="list-disc list-inside">{#each edu.bullets.filter(b=>b) as b}<li>{b}</li>{/each}</ul>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Projects -->
						{#if data.projects.length > 0}
							<div class="mb-2">
								<h2 class="uppercase tracking-wider pb-0.5 mb-0.5 font-normal" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}; font-size: {data.fonts.headingSize}px;">Projects</h2>
								{#each data.projects as project}
									<div class="mb-1">
										<span class="font-bold" style="color: {project.url ? data.colors.linkColor : data.colors.textColor}">{project.name}</span>
										{#if project.stack} | <span class="font-bold">{project.stack}</span>{/if}
										{#if project.award} · {project.award}{/if}
										<ul class="list-disc list-inside">{#each project.bullets.filter(b=>b) as b}<li>{b}</li>{/each}</ul>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Experience -->
						{#if data.workExperience.length > 0}
							<div class="mb-2">
								<h2 class="uppercase tracking-wider pb-0.5 mb-0.5 font-normal" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}; font-size: {data.fonts.headingSize}px;">Experience</h2>
								{#each data.workExperience as work}
									<div class="mb-1">
										<div class="flex justify-between"><span class="font-bold">{work.title}</span><span class="font-bold">{formatDate(work.startDate)} - {work.isPresent ? 'Present' : formatDate(work.endDate)}</span></div>
										<div class="flex justify-between"><span>{work.company}</span><span>{work.location}</span></div>
										<ul class="list-disc list-inside">{#each work.bullets.filter(b=>b) as b}<li>{b}</li>{/each}</ul>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Leadership -->
						{#if data.leadership.length > 0}
							<div class="mb-2">
								<h2 class="uppercase tracking-wider pb-0.5 mb-0.5 font-normal" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}; font-size: {data.fonts.headingSize}px;">Leadership</h2>
								{#each data.leadership as lead}
									<div class="mb-1">
										<div class="flex justify-between"><span class="font-bold">{lead.title}</span><span class="font-bold">{formatDate(lead.startDate)} - {lead.isPresent ? 'Present' : formatDate(lead.endDate)}</span></div>
										<div class="flex justify-between"><span>{lead.organization}</span><span>{lead.location}</span></div>
										<ul class="list-disc list-inside">{#each lead.bullets.filter(b=>b) as b}<li>{b}</li>{/each}</ul>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Skills -->
						{#if data.skills.length > 0}
							<div class="mb-2">
								<h2 class="uppercase tracking-wider pb-0.5 mb-0.5 font-normal" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}; font-size: {data.fonts.headingSize}px;">Skills</h2>
								{#each data.skills.filter(s => s.category && s.skills) as skill}
									<p><span class="font-bold">{skill.category}:</span> {skill.skills}</p>
								{/each}
							</div>
						{/if}

						<!-- Achievements -->
						{#if data.achievements.length > 0}
							<div class="mb-2">
								<h2 class="uppercase tracking-wider pb-0.5 mb-0.5 font-normal" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}; font-size: {data.fonts.headingSize}px;">Achievements / Certifications</h2>
								{#each data.achievements.filter(a => a.title) as achievement}
									<div class="mb-1">
										<span class="font-bold">{achievement.title}</span>{#if achievement.date} | {achievement.date}{/if}
										{#if achievement.description}<p>{achievement.description}</p>{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
