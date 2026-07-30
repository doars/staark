let update = null;

window.benchmark = {
	setup: async ({ complexity, rootNode }) => {
		const { h, patch } = window.superfine;
		const itemCount = 100 * complexity;
		let reversed = false;

		update = () => {
			const children = [];
			for (let index = 0; index < itemCount; index++) {
				const itemIndex = reversed ? itemCount - index - 1 : index;
				children.push(
					h("input", {
						key: `item-${itemIndex}`,
						value: itemIndex,
					}),
				);
			}
			patch(rootNode, h("div", {}, [h("main", {}, children)]));
		};

		update();
		window.initialItems = window.benchmarkHelpers.getElementChildren(
			rootNode,
			"main",
		);
		reversed = true;
	},

	run: async () => {
		update();
	},

	verify: ({ complexity, rootNode }, functionName) => {
		window.benchmarkHelpers.verifyInputOrder(
			rootNode,
			100 * complexity,
			functionName === "run",
			window.initialItems,
		);
	},

	cleanup: async ({ rootNode }) => {
		update = null;
		window.initialItems = null;
		for (let index = rootNode.childNodes.length - 1; index >= 0; index--) {
			rootNode.childNodes[index].remove();
		}
	},
};
