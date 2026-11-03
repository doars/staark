window.benchmarkHelpers = {
	assert: (condition, message) => {
		if (!condition) {
			throw new Error(message);
		}
	},

	getElementChildren: (rootNode, selector) => {
		const element = rootNode.querySelector(selector);
		window.benchmarkHelpers.assert(element, `Missing ${selector} element.`);
		return Array.from(element.children);
	},

	verifyInputOrder: (rootNode, itemCount, reversed, initialItems = null) => {
		const { assert, getElementChildren } = window.benchmarkHelpers;
		const items = getElementChildren(rootNode, "main");
		assert(items.length === itemCount, "Unexpected input count.");
		for (let index = 0; index < itemCount; index++) {
			const itemIndex = reversed ? itemCount - index - 1 : index;
			assert(items[index].value === `${itemIndex}`, "Incorrect input order.");
			if (initialItems) {
				assert(
					items[index] === initialItems[itemIndex],
					"Keyed input identity was not preserved.",
				);
			}
		}
	},

	verifyReorder: (rootNode, itemCount, reversed) => {
		const { assert, getElementChildren } = window.benchmarkHelpers;
		const items = getElementChildren(rootNode, "main");
		assert(items.length === itemCount, "Unexpected reordered item count.");
		for (let index = 0; index < itemCount; index++) {
			let number = index % 7;
			if (reversed) {
				number = 6 - number;
			}
			const type = number === 0 ? "p" : `h${number}`;
			assert(items[index].localName === type, "Incorrect element order.");
			assert(items[index].textContent === type, "Incorrect element text.");
		}
	},

	verifyTodos: (rootNode, itemCount, updated) => {
		const { assert, getElementChildren } = window.benchmarkHelpers;
		const items = getElementChildren(rootNode, "ul");
		assert(items.length === itemCount, "Unexpected todo count.");
		for (let index = 0; index < itemCount; index++) {
			const completed = updated && index % 2 === 0;
			assert(
				items[index].querySelector(".task-text").textContent ===
					(updated ? "updated" : "original"),
				"Incorrect todo text.",
			);
			assert(
				items[index].classList.contains("completed") === completed,
				"Incorrect todo completion state.",
			);
		}
	},

	createRows: (count) => {
		const rows = [];
		for (let index = 0; index < count; index++) {
			rows.push({ id: index, label: `row ${index}` });
		}
		return rows;
	},

	recordRows: (rootNode) => {
		const elements = new Map();
		for (const element of window.benchmarkHelpers.getElementChildren(
			rootNode,
			"ul",
		)) {
			elements.set(element.getAttribute("data-id"), element);
		}
		window.initialRows = elements;
	},

	verifyRows: (rootNode, rows) => {
		const { assert, getElementChildren } = window.benchmarkHelpers;
		const items = getElementChildren(rootNode, "ul");
		assert(items.length === rows.length, "Unexpected row count.");
		for (let index = 0; index < rows.length; index++) {
			const id = `${rows[index].id}`;
			assert(
				items[index].getAttribute("data-id") === id,
				"Incorrect row order.",
			);
			assert(
				items[index].firstChild.textContent === rows[index].label,
				"Incorrect row label.",
			);
			const initial = window.initialRows?.get(id);
			assert(
				!initial || initial === items[index],
				"Keyed row identity was not preserved.",
			);
		}
	},

	resolveWhenDone: async (
		waitForFirstCheck = null,
		verificationCheck = null,
	) => {
		if (waitForFirstCheck) {
			await waitForFirstCheck;
		}

		if (verificationCheck && !verificationCheck()) {
			await new Promise((resolve) => {
				const intervalId = setInterval(() => {
					if (verificationCheck()) {
						clearInterval(intervalId);
						resolve();
					}
				}, 0);
			});
		}
	},

	childNodesToObject: (node) => {
		const abstractChildNodes = [];
		for (let i = 0; i < node.childNodes.length; i++) {
			const childNode = node.childNodes[i];
			if (childNode instanceof Text) {
				abstractChildNodes.push(childNode.textContent ?? "");
			} else {
				const attributes = {};
				for (let i = 0; i < childNode.attributes.length; i++) {
					const attribute = childNode.attributes[i];
					attributes[attribute.name] = attribute.value;
				}

				abstractChildNodes.push({
					nodeName: childNode.nodeName,
					attributes: attributes,
					children: window.benchmarkHelpers.childNodesToObject(childNode),
				});
			}
		}
		return abstractChildNodes;
	},
};
