window.benchmark = {
	setup: async ({ complexity, rootNode }) => {
		const { app, h } = window.hyperapp;
		window.reverseItems = (_state) => ({ reversed: true });
		window.dispatch = app({
			node: rootNode,
			view: (state) => {
				const children = [];
				const itemCount = 100 * complexity;
				for (let index = 0; index < itemCount; index++) {
					const itemIndex = state.reversed ? itemCount - index - 1 : index;
					children.push(
						h("input", {
							key: `item-${itemIndex}`,
							value: itemIndex,
						}),
					);
				}
				return h("div", {}, [h("main", {}, children)]);
			},
			init: { reversed: false },
		});
		await new Promise(requestAnimationFrame);
		window.initialItems = window.benchmarkHelpers.getElementChildren(
			rootNode,
			"main",
		);
	},

	run: async () => {
		window.dispatch(window.reverseItems);
		await new Promise(requestAnimationFrame);
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
		window.dispatch = null;
		window.reverseItems = null;
		window.initialItems = null;
		for (let index = rootNode.childNodes.length - 1; index >= 0; index--) {
			rootNode.childNodes[index].remove();
		}
	},
};
