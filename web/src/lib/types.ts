export interface PersonalInfo {
	name: string;
	phone: string;
	location: string;
	email: string;
	website: string;
	linkedin: string;
	github: string;
}

export interface Profile {
	summary: string;
}

export interface WorkExperience {
	id: string;
	title: string;
	company: string;
	location: string;
	startDate: string;
	endDate: string;
	isPresent: boolean;
	bullets: string[];
}

export interface Project {
	id: string;
	name: string;
	stack: string;
	url: string;
	award: string; // e.g., "NexHacks 2026 (1st Place)"
	bullets: string[];
}

export interface Education {
	id: string;
	institution: string;
	location: string;
	degree: string;
	major: string;
	startDate: string;
	endDate: string;
	isPresent: boolean;
	bullets: string[];
}

export interface Leadership {
	id: string;
	title: string;
	organization: string;
	location: string;
	startDate: string;
	endDate: string;
	isPresent: boolean;
	bullets: string[];
}

export interface Achievement {
	id: string;
	title: string;
	date: string;
	description: string;
}

export interface SkillCategory {
	id: string;
	category: string;
	skills: string;
}

export interface ColorSettings {
	headColor: string;
	textColor: string;
	accentColor: string;
	linkColor: string;
}

export type SectionId = 'profile' | 'education' | 'projects' | 'experience' | 'leadership' | 'skills' | 'achievements';

export const defaultSectionOrder: SectionId[] = [
	'profile',
	'education', 
	'projects',
	'experience',
	'leadership',
	'skills',
	'achievements'
];

export const sectionLabels: Record<SectionId, string> = {
	profile: 'Profile',
	education: 'Education',
	projects: 'Projects',
	experience: 'Experience',
	leadership: 'Leadership',
	skills: 'Skills',
	achievements: 'Achievements'
};

export interface ResumeData {
	personalInfo: PersonalInfo;
	profile: Profile;
	education: Education[];
	projects: Project[];
	workExperience: WorkExperience[];
	leadership: Leadership[];
	skills: SkillCategory[];
	achievements: Achievement[];
	colors: ColorSettings;
	sectionOrder: SectionId[];
}

export const defaultResumeData: ResumeData = {
	personalInfo: {
		name: '',
		phone: '',
		location: '',
		email: '',
		website: '',
		linkedin: '',
		github: ''
	},
	profile: {
		summary: ''
	},
	education: [],
	projects: [],
	workExperience: [],
	leadership: [],
	skills: [],
	achievements: [],
	colors: {
		headColor: '#22227f',
		textColor: '#1b1b1b',
		accentColor: '#22328A',
		linkColor: '#1d4ed8'
	},
	sectionOrder: [...defaultSectionOrder]
};
