let update = null;
let unmount = null;
let state = null;

window.benchmark = {
	setup: async ({ complexity, rootNode }) => {
		const { mount, node } = window.staark;
		[update, unmount, state] = mount(
			rootNode,
			(state) => {
				const children = [];
				const itemCount = 100 * complexity;
				for (let index = 0; index < itemCount; index++) {
					const itemIndex = state.reversed ? itemCount - index - 1 : index;
					children.push(
						node("input", {
							key: `item-${itemIndex}`,
							value: itemIndex,
						}),
					);
				}
				return node("main", children);
			},
			{ reversed: false },
		);
		window.initialItems = window.benchmarkHelpers.getElementChildren(
			rootNode,
			"main",
		);
	},

	run: async () => {
		state.reversed = true;
		await update();
	},

	verify: ({ complexity, rootNode }, functionName) => {
		window.benchmarkHelpers.verifyInputOrder(
			rootNode,
			100 * complexity,
			functionName === "run",
			window.initialItems,
		);
	},

	cleanup: async () => {
		unmount();
		unmount = null;
		update = null;
		state = null;
		window.initialItems = null;
	},
};
