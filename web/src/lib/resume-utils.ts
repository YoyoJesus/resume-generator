import type { ResumeData } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function generateId(): string {
	return Math.random().toString(36).substring(2, 9);
}

export function formatDate(dateStr: string | undefined): string {
	if (!dateStr) return '';
	const [year, month] = dateStr.split('-');
	const monthName = MONTHS[parseInt(month) - 1];
	return `${monthName} ${year}`;
}

// Estimate if resume exceeds one page (rough heuristic based on content)
export function estimateOverOnePage(data: ResumeData): boolean {
	let lines = 0;
	lines += data.profile.summary ? 2 : 0;
	lines += data.education.length * 3;
	data.education.forEach((e) => (lines += e.bullets.filter((b) => b).length));
	lines += data.projects.length * 2;
	data.projects.forEach((p) => (lines += p.bullets.filter((b) => b).length));
	lines += data.workExperience.length * 3;
	data.workExperience.forEach((w) => (lines += w.bullets.filter((b) => b).length));
	lines += data.leadership.length * 3;
	data.leadership.forEach((l) => (lines += l.bullets.filter((b) => b).length));
	lines += data.skills.length * 1;
	lines += data.achievements.length * 2;
	return lines > 55; // Rough estimate for one page
}
