<script lang="ts">
	import { onMount } from 'svelte';
	import { resumeStore } from '$lib/store';
	import { generateTypstCode } from '$lib/typst-generator';
	import { initCompiler, compileToPdf, downloadPdf } from '$lib/pdf-compiler';
	import type { ResumeData, WorkExperience, Project, Education, SkillCategory } from '$lib/types';
	import { defaultResumeData } from '$lib/types';

	let data: ResumeData = $state(structuredClone(defaultResumeData));
	let activeTab = $state('personal');
	let showCode = $state(false);
	let isCompiling = $state(false);
	let compileError = $state<string | null>(null);
	let typstCode = $derived(generateTypstCode(data));

	onMount(() => {
		resumeStore.loadFromStorage();
		const unsub = resumeStore.subscribe(val => {
			data = val;
		});
		// Pre-initialize compiler in background
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

	// Work Experience
	function addWorkExperience() {
		data.workExperience = [...data.workExperience, {
			id: generateId(),
			title: '',
			company: '',
			location: '',
			startDate: '',
			endDate: '',
			isPresent: false,
			bullets: ['']
		}];
	}

	function removeWorkExperience(id: string) {
		data.workExperience = data.workExperience.filter(w => w.id !== id);
	}

	function addWorkBullet(work: WorkExperience) {
		work.bullets = [...work.bullets, ''];
	}

	function removeWorkBullet(work: WorkExperience, index: number) {
		work.bullets = work.bullets.filter((_, i) => i !== index);
	}

	// Projects
	function addProject() {
		data.projects = [...data.projects, {
			id: generateId(),
			name: '',
			stack: '',
			url: '',
			bullets: ['']
		}];
	}

	function removeProject(id: string) {
		data.projects = data.projects.filter(p => p.id !== id);
	}

	function addProjectBullet(project: Project) {
		project.bullets = [...project.bullets, ''];
	}

	function removeProjectBullet(project: Project, index: number) {
		project.bullets = project.bullets.filter((_, i) => i !== index);
	}

	// Education
	function addEducation() {
		data.education = [...data.education, {
			id: generateId(),
			institution: '',
			location: '',
			degree: '',
			major: '',
			startDate: '',
			endDate: '',
			isPresent: false,
			bullets: ['']
		}];
	}

	function removeEducation(id: string) {
		data.education = data.education.filter(e => e.id !== id);
	}

	function addEducationBullet(edu: Education) {
		edu.bullets = [...edu.bullets, ''];
	}

	function removeEducationBullet(edu: Education, index: number) {
		edu.bullets = edu.bullets.filter((_, i) => i !== index);
	}

	// Skills
	function addSkillCategory() {
		data.skills = [...data.skills, {
			id: generateId(),
			category: '',
			skills: ''
		}];
	}

	function removeSkillCategory(id: string) {
		data.skills = data.skills.filter(s => s.id !== id);
	}

	function downloadTypst() {
		const blob = new Blob([typstCode], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'resume.typ';
		a.click();
		URL.revokeObjectURL(url);
	}

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

	function copyToClipboard() {
		navigator.clipboard.writeText(typstCode);
	}

	const tabs = [
		{ id: 'personal', label: 'Personal Info' },
		{ id: 'experience', label: 'Experience' },
		{ id: 'projects', label: 'Projects' },
		{ id: 'education', label: 'Education' },
		{ id: 'skills', label: 'Skills' },
		{ id: 'colors', label: 'Colors' }
	];
</script>

<div class="min-h-screen bg-gray-100">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">Resume Builder</h1>
				<div class="flex gap-2">
					<button class="secondary" onclick={saveData}>Save</button>
					<button class="secondary" onclick={() => showCode = !showCode}>
						{showCode ? 'Hide Code' : 'View Typst'}
					</button>
					<button class="primary" onclick={downloadPdfFile} disabled={isCompiling}>
						{isCompiling ? 'Generating...' : 'Download PDF'}
					</button>
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Form Panel -->
			<div class="bg-white rounded-lg shadow p-6">
				<!-- Tabs -->
				<div class="flex flex-wrap gap-2 mb-6 border-b pb-4">
					{#each tabs as tab}
						<button
							class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							onclick={() => activeTab = tab.id}
						>
							{tab.label}
						</button>
					{/each}
				</div>

				<!-- Personal Info Tab -->
				{#if activeTab === 'personal'}
					<div class="space-y-4">
						<h2 class="text-lg font-semibold">Personal Information</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="name">Full Name</label>
								<input id="name" type="text" bind:value={data.personalInfo.name} placeholder="John Doe" />
							</div>
							<div>
								<label for="email">Email</label>
								<input id="email" type="email" bind:value={data.personalInfo.email} placeholder="john@example.com" />
							</div>
							<div>
								<label for="phone">Phone</label>
								<input id="phone" type="tel" bind:value={data.personalInfo.phone} placeholder="+1 (555) 123-4567" />
							</div>
							<div>
								<label for="location">Location</label>
								<input id="location" type="text" bind:value={data.personalInfo.location} placeholder="San Francisco, CA" />
							</div>
							<div>
								<label for="website">Website</label>
								<input id="website" type="text" bind:value={data.personalInfo.website} placeholder="johndoe.com" />
							</div>
							<div>
								<label for="linkedin">LinkedIn Username</label>
								<input id="linkedin" type="text" bind:value={data.personalInfo.linkedin} placeholder="johndoe" />
							</div>
							<div>
								<label for="github">GitHub Username</label>
								<input id="github" type="text" bind:value={data.personalInfo.github} placeholder="johndoe" />
							</div>
						</div>
					</div>
				{/if}

				<!-- Experience Tab -->
				{#if activeTab === 'experience'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Work Experience</h2>
							<button class="primary text-sm" onclick={addWorkExperience}>+ Add Experience</button>
						</div>

						{#each data.workExperience as work, workIndex}
							<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
								<div class="flex justify-between items-start">
									<span class="text-sm font-medium text-gray-500">Experience #{workIndex + 1}</span>
									<button class="danger text-sm px-2 py-1" onclick={() => removeWorkExperience(work.id)}>Remove</button>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div>
										<label>Job Title</label>
										<input type="text" bind:value={work.title} placeholder="Software Engineer" />
									</div>
									<div>
										<label>Company</label>
										<input type="text" bind:value={work.company} placeholder="Tech Corp" />
									</div>
									<div>
										<label>Location</label>
										<input type="text" bind:value={work.location} placeholder="San Francisco, CA" />
									</div>
									<div class="flex gap-2">
										<div class="flex-1">
											<label>Start Date</label>
											<input type="month" bind:value={work.startDate} />
										</div>
										<div class="flex-1">
											<label>End Date</label>
											<input type="month" bind:value={work.endDate} disabled={work.isPresent} />
										</div>
									</div>
									<div class="flex items-center gap-2 md:col-span-2">
										<input type="checkbox" id="present-{work.id}" bind:checked={work.isPresent} class="w-4 h-4" />
										<label for="present-{work.id}" class="mb-0">Currently working here</label>
									</div>
								</div>
								<div>
									<div class="flex items-center justify-between mb-2">
										<label class="mb-0">Bullet Points</label>
										<button class="secondary text-xs px-2 py-1" onclick={() => addWorkBullet(work)}>+ Add</button>
									</div>
									{#each work.bullets as bullet, bulletIndex}
										<div class="flex gap-2 mb-2">
											<input type="text" bind:value={work.bullets[bulletIndex]} placeholder="Describe your achievement..." class="flex-1" />
											{#if work.bullets.length > 1}
												<button class="danger text-xs px-2" onclick={() => removeWorkBullet(work, bulletIndex)}>X</button>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}

						{#if data.workExperience.length === 0}
							<p class="text-gray-500 text-center py-8">No work experience added yet. Click "Add Experience" to get started.</p>
						{/if}
					</div>
				{/if}

				<!-- Projects Tab -->
				{#if activeTab === 'projects'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Projects</h2>
							<button class="primary text-sm" onclick={addProject}>+ Add Project</button>
						</div>

						{#each data.projects as project, projectIndex}
							<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
								<div class="flex justify-between items-start">
									<span class="text-sm font-medium text-gray-500">Project #{projectIndex + 1}</span>
									<button class="danger text-sm px-2 py-1" onclick={() => removeProject(project.id)}>Remove</button>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div>
										<label>Project Name</label>
										<input type="text" bind:value={project.name} placeholder="My Awesome Project" />
									</div>
									<div>
										<label>Tech Stack</label>
										<input type="text" bind:value={project.stack} placeholder="React, Node.js, PostgreSQL" />
									</div>
									<div class="md:col-span-2">
										<label>Project URL</label>
										<input type="text" bind:value={project.url} placeholder="https://github.com/user/project" />
									</div>
								</div>
								<div>
									<div class="flex items-center justify-between mb-2">
										<label class="mb-0">Bullet Points</label>
										<button class="secondary text-xs px-2 py-1" onclick={() => addProjectBullet(project)}>+ Add</button>
									</div>
									{#each project.bullets as bullet, bulletIndex}
										<div class="flex gap-2 mb-2">
											<input type="text" bind:value={project.bullets[bulletIndex]} placeholder="Describe the project..." class="flex-1" />
											{#if project.bullets.length > 1}
												<button class="danger text-xs px-2" onclick={() => removeProjectBullet(project, bulletIndex)}>X</button>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}

						{#if data.projects.length === 0}
							<p class="text-gray-500 text-center py-8">No projects added yet. Click "Add Project" to get started.</p>
						{/if}
					</div>
				{/if}

				<!-- Education Tab -->
				{#if activeTab === 'education'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Education</h2>
							<button class="primary text-sm" onclick={addEducation}>+ Add Education</button>
						</div>

						{#each data.education as edu, eduIndex}
							<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
								<div class="flex justify-between items-start">
									<span class="text-sm font-medium text-gray-500">Education #{eduIndex + 1}</span>
									<button class="danger text-sm px-2 py-1" onclick={() => removeEducation(edu.id)}>Remove</button>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div>
										<label>Institution</label>
										<input type="text" bind:value={edu.institution} placeholder="University of Technology" />
									</div>
									<div>
										<label>Location</label>
										<input type="text" bind:value={edu.location} placeholder="Boston, MA" />
									</div>
									<div>
										<label>Degree</label>
										<input type="text" bind:value={edu.degree} placeholder="Bachelor of Science" />
									</div>
									<div>
										<label>Major</label>
										<input type="text" bind:value={edu.major} placeholder="Computer Science" />
									</div>
									<div class="flex gap-2">
										<div class="flex-1">
											<label>Start Date</label>
											<input type="month" bind:value={edu.startDate} />
										</div>
										<div class="flex-1">
											<label>End Date</label>
											<input type="month" bind:value={edu.endDate} disabled={edu.isPresent} />
										</div>
									</div>
									<div class="flex items-center gap-2">
										<input type="checkbox" id="edu-present-{edu.id}" bind:checked={edu.isPresent} class="w-4 h-4" />
										<label for="edu-present-{edu.id}" class="mb-0">Currently enrolled</label>
									</div>
								</div>
								<div>
									<div class="flex items-center justify-between mb-2">
										<label class="mb-0">Additional Info (GPA, honors, etc.)</label>
										<button class="secondary text-xs px-2 py-1" onclick={() => addEducationBullet(edu)}>+ Add</button>
									</div>
									{#each edu.bullets as bullet, bulletIndex}
										<div class="flex gap-2 mb-2">
											<input type="text" bind:value={edu.bullets[bulletIndex]} placeholder="GPA: 3.8/4.0" class="flex-1" />
											{#if edu.bullets.length > 1}
												<button class="danger text-xs px-2" onclick={() => removeEducationBullet(edu, bulletIndex)}>X</button>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}

						{#if data.education.length === 0}
							<p class="text-gray-500 text-center py-8">No education added yet. Click "Add Education" to get started.</p>
						{/if}
					</div>
				{/if}

				<!-- Skills Tab -->
				{#if activeTab === 'skills'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Skills</h2>
							<button class="primary text-sm" onclick={addSkillCategory}>+ Add Category</button>
						</div>

						{#each data.skills as skill}
							<div class="border rounded-lg p-4 space-y-3 bg-gray-50">
								<div class="flex justify-between items-start">
									<div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
										<div>
											<label>Category</label>
											<input type="text" bind:value={skill.category} placeholder="Languages" />
										</div>
										<div>
											<label>Skills (comma separated)</label>
											<input type="text" bind:value={skill.skills} placeholder="JavaScript, Python, Go" />
										</div>
									</div>
									<button class="danger text-sm px-2 py-1 ml-2" onclick={() => removeSkillCategory(skill.id)}>Remove</button>
								</div>
							</div>
						{/each}

						{#if data.skills.length === 0}
							<p class="text-gray-500 text-center py-8">No skills added yet. Click "Add Category" to get started.</p>
						{/if}
					</div>
				{/if}

				<!-- Colors Tab -->
				{#if activeTab === 'colors'}
					<div class="space-y-4">
						<h2 class="text-lg font-semibold">Color Settings</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="headColor">Header Color (Name)</label>
								<div class="flex gap-2">
									<input type="color" id="headColor" bind:value={data.colors.headColor} class="w-12 h-10 p-1 rounded" />
									<input type="text" bind:value={data.colors.headColor} class="flex-1" />
								</div>
							</div>
							<div>
								<label for="textColor">Text Color</label>
								<div class="flex gap-2">
									<input type="color" id="textColor" bind:value={data.colors.textColor} class="w-12 h-10 p-1 rounded" />
									<input type="text" bind:value={data.colors.textColor} class="flex-1" />
								</div>
							</div>
							<div>
								<label for="accentColor">Accent Color (Headings)</label>
								<div class="flex gap-2">
									<input type="color" id="accentColor" bind:value={data.colors.accentColor} class="w-12 h-10 p-1 rounded" />
									<input type="text" bind:value={data.colors.accentColor} class="flex-1" />
								</div>
							</div>
							<div>
								<label for="linkColor">Link Color</label>
								<div class="flex gap-2">
									<input type="color" id="linkColor" bind:value={data.colors.linkColor} class="w-12 h-10 p-1 rounded" />
									<input type="text" bind:value={data.colors.linkColor} class="flex-1" />
								</div>
							</div>
						</div>
						<div class="mt-4 p-4 border rounded-lg">
							<h3 class="text-sm font-medium mb-2">Preview</h3>
							<p style="color: {data.colors.headColor}; font-weight: bold; font-size: 1.25rem;">JOHN DOE</p>
							<p style="color: {data.colors.accentColor}; font-variant: small-caps; border-bottom: 1px solid {data.colors.accentColor};">Experience</p>
							<p style="color: {data.colors.textColor};">Sample body text content</p>
							<p><a href="#" style="color: {data.colors.linkColor};">Sample link</a></p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Preview Panel -->
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-lg font-semibold mb-4">
					{showCode ? 'Typst Code' : 'Resume Preview'}
				</h2>

				{#if showCode}
					<div class="relative">
						<button class="absolute top-2 right-2 secondary text-xs" onclick={copyToClipboard}>Copy</button>
						<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[calc(100vh-16rem)] text-sm"><code>{typstCode}</code></pre>
					</div>
				{:else}
					<div class="border rounded-lg p-6 min-h-[600px] bg-white" style="font-family: 'Georgia', serif;">
						<!-- Header Preview -->
						<div class="text-center mb-4">
							<h1 class="text-xl font-bold uppercase tracking-wide" style="color: {data.colors.headColor}">
								{data.personalInfo.name || 'Your Name'}
							</h1>
							<div class="text-sm mt-1 flex flex-wrap justify-center gap-x-2" style="color: {data.colors.textColor}">
								{#if data.personalInfo.location}<span>{data.personalInfo.location}</span>{/if}
								{#if data.personalInfo.email}<span>| <a href="mailto:{data.personalInfo.email}" style="color: {data.colors.linkColor}">{data.personalInfo.email}</a></span>{/if}
								{#if data.personalInfo.website}<span>| <a href="https://{data.personalInfo.website}" style="color: {data.colors.linkColor}">{data.personalInfo.website}</a></span>{/if}
								{#if data.personalInfo.linkedin}<span>| <a href="https://linkedin.com/in/{data.personalInfo.linkedin}" style="color: {data.colors.linkColor}">linkedin.com/in/{data.personalInfo.linkedin}</a></span>{/if}
								{#if data.personalInfo.github}<span>| <a href="https://github.com/{data.personalInfo.github}" style="color: {data.colors.linkColor}">github.com/{data.personalInfo.github}</a></span>{/if}
								{#if data.personalInfo.phone}<span>| {data.personalInfo.phone}</span>{/if}
							</div>
						</div>

						<!-- Experience Preview -->
						{#if data.workExperience.length > 0}
							<div class="mb-4">
								<h2 class="text-sm uppercase tracking-wider pb-1 mb-2" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}">Experience</h2>
								{#each data.workExperience as work}
									<div class="mb-3">
										<div class="flex justify-between">
											<span class="font-bold" style="color: {data.colors.textColor}">{work.title || 'Job Title'}</span>
											<span class="font-bold text-sm" style="color: {data.colors.textColor}">{work.startDate ? work.startDate.replace('-', '/') : 'Start'} - {work.isPresent ? 'Present' : (work.endDate ? work.endDate.replace('-', '/') : 'End')}</span>
										</div>
										<div class="flex justify-between text-sm" style="color: {data.colors.textColor}">
											<span>{work.company || 'Company'}</span>
											<span>{work.location}</span>
										</div>
										<ul class="list-disc list-inside text-sm mt-1" style="color: {data.colors.textColor}">
											{#each work.bullets.filter(b => b.trim()) as bullet}
												<li>{bullet}</li>
											{/each}
										</ul>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Projects Preview -->
						{#if data.projects.length > 0}
							<div class="mb-4">
								<h2 class="text-sm uppercase tracking-wider pb-1 mb-2" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}">Projects</h2>
								{#each data.projects as project}
									<div class="mb-3">
										<div>
											<span class="font-bold" style="color: {data.colors.textColor}">{project.url ? '' : ''}<a href={project.url} style="color: {project.url ? data.colors.linkColor : data.colors.textColor}; font-weight: bold;">{project.name || 'Project Name'}</a></span>
											{#if project.stack}
												<span style="color: {data.colors.textColor}"> | <span class="font-bold">{project.stack}</span></span>
											{/if}
										</div>
										<ul class="list-disc list-inside text-sm mt-1" style="color: {data.colors.textColor}">
											{#each project.bullets.filter(b => b.trim()) as bullet}
												<li>{bullet}</li>
											{/each}
										</ul>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Education Preview -->
						{#if data.education.length > 0}
							<div class="mb-4">
								<h2 class="text-sm uppercase tracking-wider pb-1 mb-2" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}">Education</h2>
								{#each data.education as edu}
									<div class="mb-3">
										<div class="flex justify-between">
											<span class="font-bold" style="color: {data.colors.textColor}">{edu.institution || 'Institution'}</span>
											<span class="font-bold text-sm" style="color: {data.colors.textColor}">{edu.location}</span>
										</div>
										<div class="flex justify-between text-sm" style="color: {data.colors.textColor}">
											<span>{edu.degree}{edu.major ? `, ${edu.major}` : ''}</span>
											<span>{edu.startDate ? edu.startDate.replace('-', '/') : 'Start'} - {edu.isPresent ? 'Present' : (edu.endDate ? edu.endDate.replace('-', '/') : 'End')}</span>
										</div>
										<ul class="list-disc list-inside text-sm mt-1" style="color: {data.colors.textColor}">
											{#each edu.bullets.filter(b => b.trim()) as bullet}
												<li>{bullet}</li>
											{/each}
										</ul>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Skills Preview -->
						{#if data.skills.length > 0}
							<div class="mb-4">
								<h2 class="text-sm uppercase tracking-wider pb-1 mb-2" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}">Skills</h2>
								{#each data.skills.filter(s => s.category.trim() && s.skills.trim()) as skill}
									<p class="text-sm" style="color: {data.colors.textColor}"><span class="font-bold">{skill.category}:</span> {skill.skills}</p>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
