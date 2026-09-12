import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompiledPreview } from './pdf-compiler';
import { createPreviewScheduler } from './preview-scheduler';

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => (resolve = done));
	return { promise, resolve };
}

function preview(svg: string): CompiledPreview {
	return { svg, pages: [{ pageOffset: 0, width: 595, height: 842 }] };
}

afterEach(() => vi.useRealTimers());

describe('createPreviewScheduler', () => {
	it('ignores a prior compilation that finishes during the latest debounce interval', async () => {
		vi.useFakeTimers();
		const first = deferred<CompiledPreview>();
		const second = deferred<CompiledPreview>();
		const compile = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const onInvalidate = vi.fn();
		const onResult = vi.fn();
		const onSettled = vi.fn();
		const scheduler = createPreviewScheduler(compile, { onInvalidate, onResult, onSettled, onError: vi.fn() }, 300);

		scheduler.schedule('old source');
		await vi.advanceTimersByTimeAsync(300);
		expect(compile).toHaveBeenCalledWith('old source');

		scheduler.schedule('new source');
		first.resolve(preview('old'));
		await Promise.resolve();
		expect(onResult).not.toHaveBeenCalled();
		expect(onSettled).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(300);
		second.resolve(preview('new'));
		await Promise.resolve();
		expect(onInvalidate).toHaveBeenCalledTimes(2);
		expect(onResult).toHaveBeenCalledExactlyOnceWith(preview('new'));
		expect(onSettled).toHaveBeenCalledOnce();
	});
});
