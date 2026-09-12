import type { CompiledPreview } from './pdf-compiler';

interface PreviewSchedulerCallbacks {
	onInvalidate: () => void;
	onResult: (preview: CompiledPreview) => void;
	onError: (error: unknown) => void;
	onSettled: () => void;
}

/** Debounces preview compilation and prevents an older result from becoming current. */
export function createPreviewScheduler(
	compile: (code: string) => Promise<CompiledPreview>,
	callbacks: PreviewSchedulerCallbacks,
	delayMs = 300,
) {
	let generation = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	return {
		/** Invalidates the current preview immediately, then compiles the latest source after the delay. */
		schedule(code: string) {
			const request = ++generation;
			clearTimeout(timer);
			callbacks.onInvalidate();
			timer = setTimeout(async () => {
				try {
					const preview = await compile(code);
					if (request === generation) callbacks.onResult(preview);
				} catch (error) {
					if (request === generation) callbacks.onError(error);
				} finally {
					if (request === generation) callbacks.onSettled();
				}
			}, delayMs);
		},
		/** Cancels pending work and ignores any compilation already in flight. */
		dispose() {
			generation += 1;
			clearTimeout(timer);
		},
	};
}
