let update = null,
	run = null;

window.benchmark = {
	setup: async ({ complexity, rootNode }) => {
		const count = 100 * complexity;
		const middle = count >> 1;
		const expected = window.benchmarkHelpers.createRows(count);
		window.rowsSetup = window.benchmarkHelpers.createRows(count);
		expected.splice(middle, 1);
		window.rowsRun = expected;
		const { h, text, patch } = window.superfine;
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
				// NOTE: This library allows you to modify the root node and disconnects it from the DOM when the tag name of the root node is changed. Hence an additional virtual node for it is included.
				rootNode,
				h("div", {}, [
					h(
						"ul",
						{},
						rows.map((row) =>
							h("li", { key: row.id, "data-id": row.id, class: "row" }, [
								h("span", {}, text(row.label)),
								h("button", { onclick: remove }, text("x")),
							]),
						),
					),
				]),
			);
		};
		update();
		window.benchmarkHelpers.recordRows(rootNode);
		run = () => {
			rows.splice(middle, 1);
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
		// Superfine keeps the previous virtual node on the root element.
		rootNode.vdom = null;
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
