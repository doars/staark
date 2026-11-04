/**
 * Delays the execution for a specified amount of time.
 *
 * @param {number} time The amount of time to delay in milliseconds.
 * @param {AbortSignal} [signal] Signal that ends the delay early by rejecting with its reason.
 * @returns {Promise<null>} A promise that resolves after the delay.
 */
export const delay = (time, signal) =>
	new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason);
			return;
		}
		if (!(time > 0)) {
			resolve(null);
			return;
		}
		const onAbort = () => {
			clearTimeout(timeoutIdentifier);
			reject(signal.reason);
		};
		const timeoutIdentifier = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve(null);
		}, time);
		signal?.addEventListener("abort", onAbort, { once: true });
	});
