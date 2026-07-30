let ran = null,
	update = null;

window.benchmark = {
	setup: async ({ complexity, rootNode }) => {
		const { prepare, node } = window.staarkPatch;

		const patch = prepare(rootNode);

		update = () => {
			patch(
				node(
					"main",
					Array(100 * complexity)
						.fill(null)
						.map((_, index) => {
							let number = index % 7;
							if (ran) {
								number = 6 - number;
							}
							switch (number) {
								case 1:
									return node("h1", "h1");
								case 2:
									return node("h2", "h2");
								case 3:
									return node("h3", "h3");
								case 4:
									return node("h4", "h4");
								case 5:
									return node("h5", "h5");
								case 6:
									return node("h6", "h6");
								default:
									return node("p", "p");
							}
						}),
				),
			);
		};

		ran = false;
		update();
	},

	verify: ({ complexity, rootNode }, functionName) => {
		window.benchmarkHelpers.verifyReorder(
			rootNode,
			100 * complexity,
			functionName === "run",
		);
	},

	run: async (_dependencies) => {
		ran = true;
		update();
	},

	cleanup: async ({ rootNode }) => {
		update = null;
		state = null;

		for (let i = rootNode.childNodes.length - 1; i >= 0; i--) {
			rootNode.childNodes[i].remove();
		}
	},
};
