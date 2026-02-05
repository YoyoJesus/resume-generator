import type { ResumeData, WorkExperience, Project, Education, Leadership, Achievement, SkillCategory, SectionId } from './types';

function formatDate(dateStr: string): string {
	if (!dateStr) return 'datetime.today()';
	const [year, month] = dateStr.split('-');
	return `datetime(year: ${year}, month: ${parseInt(month)}, day: 1)`;
}

function escapeTypst(str: string): string {
	return str
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/#/g, '\\#')
		.replace(/\$/g, '\\$');
}

function generateProfile(summary: string): string {
	if (!summary.trim()) return '';
	return `= Profile
${escapeTypst(summary)}`;
}

function generateEducation(edu: Education): string {
	const endDate = edu.isPresent ? '"Present"' : formatDate(edu.endDate);
	const bullets = edu.bullets
		.filter(b => b.trim())
		.map(b => `  - ${escapeTypst(b)}`)
		.join('\n');

	return `#education-heading(
  "${escapeTypst(edu.institution)}",
  "${escapeTypst(edu.location)}",
  "${escapeTypst(edu.degree)}",
  "${escapeTypst(edu.major)}",
  ${formatDate(edu.startDate)},
  ${endDate}
)[
${bullets}
]`;
}

function generateProject(project: Project): string {
	const bullets = project.bullets
		.filter(b => b.trim())
		.map(b => `  - ${escapeTypst(b)}`)
		.join('\n');

	return `#project-heading(
  "${escapeTypst(project.name)}",
  stack: "${escapeTypst(project.stack)}",
  project-url: "${escapeTypst(project.url)}",
  award: "${escapeTypst(project.award)}"
)[
${bullets}
]`;
}

function generateWorkExperience(work: WorkExperience): string {
	const endDate = work.isPresent ? '"Present"' : formatDate(work.endDate);
	const bullets = work.bullets
		.filter(b => b.trim())
		.map(b => `  - ${escapeTypst(b)}`)
		.join('\n');

	return `#work-heading(
  "${escapeTypst(work.title)}",
  "${escapeTypst(work.company)}",
  "${escapeTypst(work.location)}",
  ${formatDate(work.startDate)},
  ${endDate}
)[
${bullets}
]`;
}

function generateLeadership(lead: Leadership): string {
	const endDate = lead.isPresent ? '"Present"' : formatDate(lead.endDate);
	const bullets = lead.bullets
		.filter(b => b.trim())
		.map(b => `  - ${escapeTypst(b)}`)
		.join('\n');

	return `#work-heading(
  "${escapeTypst(lead.title)}",
  "${escapeTypst(lead.organization)}",
  "${escapeTypst(lead.location)}",
  ${formatDate(lead.startDate)},
  ${endDate}
)[
${bullets}
]`;
}

function generateSkills(skills: SkillCategory[]): string {
	if (skills.length === 0) return '';

	const skillLines = skills
		.filter(s => s.category.trim() && s.skills.trim())
		.map(s => `- *${escapeTypst(s.category)}:* ${escapeTypst(s.skills)}`)
		.join('\n');

	if (!skillLines) return '';

	return `= Skills
#skills[
${skillLines}
]`;
}

function generateAchievements(achievements: Achievement[]): string {
	if (achievements.length === 0) return '';

	const achievementItems = achievements
		.filter(a => a.title.trim())
		.map(a => {
			const datePart = a.date ? ` | ${escapeTypst(a.date)}` : '';
			const descPart = a.description.trim() ? `\n${escapeTypst(a.description)}` : '';
			return `#achievement-heading("${escapeTypst(a.title)}", "${datePart.replace(' | ', '')}")[${descPart}]`;
		})
		.join('\n\n');

	if (!achievementItems) return '';

	return `= Achievements / Certifications
${achievementItems}`;
}

export function generateTypstCode(data: ResumeData): string {
	const { personalInfo, profile, education, projects, workExperience, leadership, skills, achievements, colors, fonts, sectionOrder } = data;

	const sections: Record<SectionId, string> = {
		profile: generateProfile(profile.summary),
		education: education.length > 0
			? `= Education\n${education.map(generateEducation).join('\n\n')}`
			: '',
		projects: projects.length > 0
			? `= Projects\n${projects.map(generateProject).join('\n\n')}`
			: '',
		experience: workExperience.length > 0
			? `= Experience\n${workExperience.map(generateWorkExperience).join('\n\n')}`
			: '',
		leadership: leadership.length > 0
			? `= Leadership\n${leadership.map(generateLeadership).join('\n\n')}`
			: '',
		skills: generateSkills(skills),
		achievements: generateAchievements(achievements)
	};

	// Generate sections in the specified order
	const orderedSections = sectionOrder
		.map(id => sections[id])
		.filter(section => section.trim() !== '')
		.join('\n\n');

	return `#let head-color = rgb("${colors.headColor}")
#let text-color = rgb("${colors.textColor}")
#let acct-color = rgb("${colors.accentColor}")
#let link-color = rgb("${colors.linkColor}")
#let font-size = ${fonts.baseSize}pt
#let personal-info-font-size = ${fonts.contactSize}pt
#let heading-size = ${fonts.headingSize}pt
#let title-size = ${fonts.nameSize}pt

#let bold(body) = {
  text(weight: 700)[#body]
}

#let link2(target, body) = {
  link(target, text(fill: link-color)[#body])
}

#let resume(
  paper: "a4",
  top-margin: 0.15in,
  bottom-margin: 0.15in,
  left-margin: 0.15in,
  right-margin: 0.15in,
  font-size: font-size,
  personal-info-font-size: personal-info-font-size,
  author-name: "",
  author-position: center,
  personal-info-position: center,
  phone: "",
  location: "",
  email: "",
  website: "",
  linkedin-user-id: "",
  github-username: "",

  body
) = {
  set document(
    title: "Resume | " + author-name,
    author: author-name,
    keywords: "cv, resume",
    date: datetime.today()
  )

  set page(
    paper: paper,
    margin: (
      top: top-margin, bottom: bottom-margin,
      left: left-margin, right: right-margin
    ),
  )

  set text(
    size: font-size, lang: "en", ligatures: false, fill: text-color
  )

  show heading.where(level: 1): it => block(width: 100%)[
    #set text(heading-size, weight: "regular", fill: acct-color)
    #smallcaps(it.body)
    #v(-1.0em)
    #line(length: 100%, stroke: stroke(thickness: 0.4pt, paint: acct-color))
    #v(-0.2em)
  ]

  let contact_item(value, link-type: "", prefix: "") = {
    if value != "" {
      if link-type != "" {
        underline(offset: 0.3em)[#link2(link-type + value)[#text(prefix + value)]]
      } else {
        value
      }
    }
  }

  align(author-position, [
    #grid(
      columns: (1fr, auto),
      gutter: 0.6em,
    )[
      #grid(
        rows: 2,
      )[
        #align(center, [
          #grid(columns: 1,
          column-gutter: 20pt,
          align: center,

          upper(text(title-size, weight: "bold", fill: head-color)[#author-name]),
        )[
          #v(-0.2em)
        ]
      ])
      #v(0.4em)

      #align(center, text(personal-info-font-size)[
          #{
            let sepSpace = 0.2em
            let items = (
              contact_item(email, link-type: "mailto:"),
              contact_item(website, link-type: "https://"),
              contact_item(
                linkedin-user-id,
                link-type: "https://linkedin.com/in/",
                prefix: "linkedin.com/in/",
              ),
              contact_item(
                github-username,
                link-type: "https://github.com/",
                prefix: "github.com/",
              ),
              contact_item(phone),
            )
            items.filter(x => x != none).join([
              #show "|": sep => {
                h(sepSpace)
                [|]
                h(sepSpace)
              }
              |
            ])
          }
        ])
      ]
    ]
  ])
  v(-1em)
  body
}

#let generic_2x2(cols, r1c1, r1c2, r2c1, r2c2) = {
  grid(
    columns: cols,
    gutter: 0.5em,
    align(left)[#r1c1 \\ #r2c1],
    align(right)[#r1c2 \\ #r2c2]
  )
}

#let skills(body) = {
  if body != [] {
    set par(leading: 0.6em)
    set list(
      body-indent: 0.1em,
      indent: 0em,
      spacing: 0.7em,
      marker: []
    )
    body
  }
}

#let period_worked(start-date, end-date) = {
  if type(end-date) == str and end-date == "Present" {
    end-date = datetime.today()
  }

  return [
    #start-date.display("[month repr:short] [year]") -
    #if (
      (end-date.month() == datetime.today().month()) and
        (end-date.year() == datetime.today().year())
      ) [
        Present
      ] else [
        #end-date.display("[month repr:short] [year]")
      ]
    ]
  }

#let work-heading(title, company, location, start-date, end-date, body) = {
  generic_2x2(
    (65%, 35%),
    [#bold(title)], [#bold(period_worked(start-date, end-date))],
    [#company], location
  )
  v(-0.2em)
  if body != [] {
    v(-0.5em)
    set par(leading: 0.6em)
    set list(indent: 1.0em)
    body
  }
}

#let project-heading(name, stack: "", project-url: "", award: "", body) = {
  if project-url.len() != 0 { underline(offset: .3em, link2(project-url)[#bold(name)]) } else {
    [#bold(name)]
  }
  if stack != "" {
    [
      #show "|": sep => { h(0.3em); [|]; h(0.3em) }
      |#bold(stack)
    ]
  }
  if award != "" {
    [ · #award]
  }
  v(-0.2em)
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    set list(indent: 1.0em)
    body
  }
}

#let education-heading(institution, location, degree, major, start-date, end-date, body) = {
  generic_2x2(
    (70%, 30%),
    [#bold(institution)], [#bold(location)],
    [#degree, #major], period_worked(start-date, end-date)
  )
  v(-0.2em)
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    set list(indent: 0.5em)
    body
  }
}

#let achievement-heading(title, date, body) = {
  [#bold(title)]
  if date != "" {
    [ | #date]
  }
  if body != [] {
    v(-0.4em)
    set par(leading: 0.6em)
    body
  }
  v(-0.2em)
}

// ========== RESUME CONTENT ==========

#show: resume.with(
  author-name: "${escapeTypst(personalInfo.name)}",
  email: "${escapeTypst(personalInfo.email)}",
  phone: "${escapeTypst(personalInfo.phone)}",
  website: "${escapeTypst(personalInfo.website)}",
  linkedin-user-id: "${escapeTypst(personalInfo.linkedin)}",
  github-username: "${escapeTypst(personalInfo.github)}",
)

${orderedSections}
`;
}
