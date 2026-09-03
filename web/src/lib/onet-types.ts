// Types for O*NET Web Services data. Kept separate from types.ts, which models
// the resume itself — a target occupation is reference data and never renders.

export interface OnetOccupationRef {
	code: string;
	title: string;
	brightOutlook: boolean;
}

// Tasks and detailed work activities: a single line of prose.
export interface OnetItem {
	id: string;
	text: string;
}

// Skills, knowledge, abilities: a named competency with a definition.
export interface OnetScaleItem {
	id: string;
	name: string;
	description: string;
}

export interface OnetTechnology {
	category: string;
	examples: { name: string; hot: boolean }[];
}

export type OnetSectionName =
	| 'tasks'
	| 'detailedWorkActivities'
	| 'technologySkills'
	| 'skills'
	| 'knowledge'
	| 'abilities';

export interface OnetOccupation {
	code: string;
	title: string;
	description: string;
	brightOutlook: boolean;
	tasks: OnetItem[];
	detailedWorkActivities: OnetItem[];
	technologySkills: OnetTechnology[];
	skills: OnetScaleItem[];
	knowledge: OnetScaleItem[];
	abilities: OnetScaleItem[];
	// Sections O*NET does not publish for this occupation. Rendered as
	// "not published" rather than as an empty list, so the two are distinguishable.
	unavailable: OnetSectionName[];
}

export const onetSectionLabels: Record<OnetSectionName, string> = {
	tasks: 'Tasks',
	detailedWorkActivities: 'Work Activities',
	technologySkills: 'Technology',
	skills: 'Skills',
	knowledge: 'Knowledge',
	abilities: 'Abilities',
};

// One change proposed by the AI tailor pass. `targetId` is the id of a work
// experience / project entry (kind 'bullet') or a skill category (kind 'skill').
export interface TailorEdit {
	kind: 'bullet' | 'skill';
	targetId: string;
	text: string;
}
