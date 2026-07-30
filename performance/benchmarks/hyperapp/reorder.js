window.benchmark = {
	setup: async ({ complexity, rootNode }) => {
		const { app, h, text } = window.hyperapp;
		window.reverseItems = (_state) => ({ reversed: true });
		window.dispatch = app({
			node: rootNode,
			view: (state) => {
				const children = [];
				for (let index = 0; index < 100 * complexity; index++) {
					let number = index % 7;
					if (state.reversed) {
						number = 6 - number;
					}
					const type = number === 0 ? "p" : `h${number}`;
					children.push(h(type, {}, text(type)));
				}
				return h("div", {}, [h("main", {}, children)]);
			},
			init: { reversed: false },
		});
		await new Promise(requestAnimationFrame);
	},

	verify: ({ complexity, rootNode }, functionName) => {
		window.benchmarkHelpers.verifyReorder(
			rootNode,
			100 * complexity,
			functionName === "run",
		);
	},

	run: async () => {
		window.dispatch(window.reverseItems);
		await new Promise(requestAnimationFrame);
	},

	cleanup: async ({ rootNode }) => {
		window.dispatch = null;
		window.reverseItems = null;
		for (let index = rootNode.childNodes.length - 1; index >= 0; index--) {
			rootNode.childNodes[index].remove();
		}
	},
};
