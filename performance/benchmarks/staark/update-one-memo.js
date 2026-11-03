let update = null,
	unmount = null,
	state = null,
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
		const { memo, mount, node } = window.staark;
		const remove = (event, state) => {
			const id = event.currentTarget.parentNode.getAttribute("data-id");
			state.rows.splice(
				state.rows.findIndex((row) => `${row.id}` === id),
				1,
			);
		};
		const renderRow = (_state, row) =>
			node("li", { key: row.id, "data-id": row.id, class: "row" }, [
				node("span", row.label),
				node("button", { click: remove }, "x"),
			]);
		[update, unmount, state] = mount(
			rootNode,
			(state) =>
				node(
					"ul",
					state.rows.map((row) => memo(renderRow, row)),
				),
			{ rows: window.benchmarkHelpers.createRows(count) },
		);
		window.benchmarkHelpers.recordRows(rootNode);
		run = () => {
			const rows = state.rows;
			rows[middle].label = `${rows[middle].label} updated`;
		};
	},

	run: async () => {
		run();
		await update();
	},

	verify: ({ rootNode }, functionName) => {
		window.benchmarkHelpers.verifyRows(
			rootNode,
			functionName === "run" ? window.rowsRun : window.rowsSetup,
		);
	},

	cleanup: async ({ rootNode }) => {
		unmount();
		unmount = null;
		update = null;
		state = null;
		run = null;
		window.initialRows = null;
		window.rowsSetup = null;
		window.rowsRun = null;
		for (let index = rootNode.childNodes.length - 1; index >= 0; index--) {
			rootNode.childNodes[index].remove();
		}
	},
};
