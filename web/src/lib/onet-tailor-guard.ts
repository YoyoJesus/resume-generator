import type { ResumeData } from './types';

export interface TailorRequestSnapshot {
	requestId: number;
	occupationCode: string;
	resumeFingerprint: string;
}

export function snapshotTailorRequest(
	data: ResumeData,
	occupationCode: string,
	requestId: number,
): TailorRequestSnapshot {
	return { requestId, occupationCode, resumeFingerprint: JSON.stringify(data) };
}

export function isTailorResponseCurrent(
	snapshot: TailorRequestSnapshot,
	data: ResumeData,
	occupationCode: string | null,
	requestId: number,
): boolean {
	return (
		snapshot.requestId === requestId &&
		snapshot.occupationCode === occupationCode &&
		snapshot.resumeFingerprint === JSON.stringify(data)
	);
}
