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
				for (let index = 0; index < 100 * complexity; index++) {
					let number = index % 7;
					if (state.reversed) {
						number = 6 - number;
					}
					const type = number === 0 ? "p" : `h${number}`;
					children.push(node(type, type));
				}
				return node("main", children);
			},
			{ reversed: false },
		);
	},

	run: async () => {
		state.reversed = true;
		await update();
	},

	verify: ({ complexity, rootNode }, functionName) => {
		window.benchmarkHelpers.verifyReorder(
			rootNode,
			100 * complexity,
			functionName === "run",
		);
	},

	cleanup: async () => {
		unmount();
		unmount = null;
		update = null;
		state = null;
	},
};
