<!-- Preview Panel -->
<div class="bg-gray-500 rounded-lg shadow p-4 flex flex-col items-center overflow-auto max-h-[calc(100vh-10rem)]">
	<h2 class="text-lg font-semibold mb-4 text-white">{showCode ? 'Typst Code' : 'Resume Preview (8.5" x 11")'}</h2>

	{#if showCode}
		<div class="relative w-full">
			<button class="absolute top-2 right-2 secondary text-xs" onclick={copyToClipboard}>Copy</button>
			<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[calc(100vh-16rem)] text-xs w-full"><code>{typstCode}</code></pre>
		</div>
	{:else}
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

			<!-- Dynamic sections in user-defined order -->
			{#each data.sectionOrder as sectionId}
				{#if sectionId === 'profile' && data.profile.summary}
					<div class="mb-2">
						<h2 class="uppercase tracking-wider pb-0.5 mb-0.5 font-normal" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}; font-size: {data.fonts.headingSize}px;">Profile</h2>
						<p style="color: {data.colors.textColor}; line-height: 1.3;">{data.profile.summary}</p>
					</div>
				{:else if sectionId === 'education' && data.education.length > 0}
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
				{:else if sectionId === 'projects' && data.projects.length > 0}
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
				{:else if sectionId === 'experience' && data.workExperience.length > 0}
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
				{:else if sectionId === 'leadership' && data.leadership.length > 0}
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
				{:else if sectionId === 'skills' && data.skills.length > 0}
					<div class="mb-2">
						<h2 class="uppercase tracking-wider pb-0.5 mb-0.5 font-normal" style="color: {data.colors.accentColor}; border-bottom: 1px solid {data.colors.accentColor}; font-size: {data.fonts.headingSize}px;">Skills</h2>
						{#each data.skills.filter(s => s.category && s.skills) as skill}
							<p><span class="font-bold">{skill.category}:</span> {skill.skills}</p>
						{/each}
					</div>
				{:else if sectionId === 'achievements' && data.achievements.length > 0}
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
			{/each}
		</div>
	{/if}
</div>