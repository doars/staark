let update = null,
	run = null;

window.benchmark = {
	setup: async ({ complexity, rootNode }) => {
		const count = 100 * complexity;
		const middle = count >> 1;
		const expected = window.benchmarkHelpers.createRows(count);
		window.rowsSetup = window.benchmarkHelpers.createRows(count);
		expected[middle] = {
			...expected[middle],
			label: `${expected[middle].label} updated`,
		};
		window.rowsRun = expected;
		const { prepare, node } = window.staarkPatch;
		const patch = prepare(rootNode);
		const rows = window.benchmarkHelpers.createRows(count);
		const remove = (event) => {
			const id = event.currentTarget.parentNode.getAttribute("data-id");
			rows.splice(
				rows.findIndex((row) => `${row.id}` === id),
				1,
			);
			update();
		};
		update = () => {
			patch(
				node(
					"ul",
					rows.map((row) =>
						node("li", { key: row.id, "data-id": row.id, class: "row" }, [
							node("span", row.label),
							node("button", { click: remove }, "x"),
						]),
					),
				),
			);
		};
		update();
		window.benchmarkHelpers.recordRows(rootNode);
		run = () => {
			rows[middle].label = `${rows[middle].label} updated`;
		};
	},

	run: async () => {
		run();
		update();
	},

	verify: ({ rootNode }, functionName) => {
		window.benchmarkHelpers.verifyRows(
			rootNode,
			functionName === "run" ? window.rowsRun : window.rowsSetup,
		);
	},

	cleanup: async ({ rootNode }) => {
		update = null;
		run = null;
		window.initialRows = null;
		window.rowsSetup = null;
		window.rowsRun = null;
		for (let index = rootNode.childNodes.length - 1; index >= 0; index--) {
			rootNode.childNodes[index].remove();
		}
	},
};
