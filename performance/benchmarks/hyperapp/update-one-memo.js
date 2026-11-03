let dispatch = null;

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
		const { app, h, memo, text } = window.hyperapp;
		const remove = (state, event) => {
			const id = event.currentTarget.parentNode.getAttribute("data-id");
			return {
				...state,
				rows: state.rows.filter((row) => `${row.id}` !== id),
			};
		};
		const rowView = (row) =>
			h("li", { key: row.id, "data-id": row.id, class: "row" }, [
				h("span", {}, text(row.label)),
				h("button", { onclick: remove }, text("x")),
			]);
		window.runAction = (state) => {
			const rows = state.rows;
			return {
				...state,
				rows: rows.map((row, index) =>
					index === middle ? { ...row, label: `${row.label} updated` } : row,
				),
			};
		};
		dispatch = app({
			node: rootNode,
			view: (state) =>
				// NOTE: This library allows you to modify the root node and disconnects it from the DOM when the tag name of the root node is changed. Hence an additional virtual node for it is included.
				h("div", {}, [
					h(
						"ul",
						{},
						state.rows.map((row) => memo(rowView, row)),
					),
				]),
			init: { rows: window.benchmarkHelpers.createRows(count) },
		});
		await new Promise(requestAnimationFrame);
		window.benchmarkHelpers.recordRows(rootNode);
	},

	run: async () => {
		dispatch(window.runAction);
		await new Promise(requestAnimationFrame);
	},

	verify: ({ rootNode }, functionName) => {
		window.benchmarkHelpers.verifyRows(
			rootNode,
			functionName === "run" ? window.rowsRun : window.rowsSetup,
		);
	},

	cleanup: async ({ rootNode }) => {
		dispatch = null;
		window.runAction = null;
		window.initialRows = null;
		window.rowsSetup = null;
		window.rowsRun = null;
		for (let index = rootNode.childNodes.length - 1; index >= 0; index--) {
			rootNode.childNodes[index].remove();
		}
	},
};
