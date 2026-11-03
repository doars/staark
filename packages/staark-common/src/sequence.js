/**
 * Finds the longest increasing subsequence of the given numbers, ignoring holes.
 *
 * @param {(number | undefined)[]} sources Numbers to search, for example the old index of each new child.
 * @returns {boolean[]} Whether the number at each index is part of the subsequence.
 */
export const increasingSubsequence = (sources) => {
	const tails = [];
	const previous = [];
	for (let index = 0; index < sources.length; index++) {
		const source = sources[index];
		if (source === undefined) {
			continue;
		}
		let low = 0;
		let high = tails.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (sources[tails[middle]] < source) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}
		previous[index] = low ? tails[low - 1] : -1;
		tails[low] = index;
	}

	const included = [];
	for (
		let index = tails[tails.length - 1];
		index >= 0;
		index = previous[index]
	) {
		included[index] = true;
	}
	return included;
};
