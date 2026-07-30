import { mount, node as n } from "@doars/staark";

/**
 * Setup staark instance.
 */
const setup = () => {
	mount(
		document.getElementById("example-app"),
		(state) =>
			n("div", [
				n(
					"div",
					{
						class: "demo-title",
					},
					"List",
				),
				n(
					"ol",
					{
						class: "demo-list",
					},
					state.todos.map((todo) =>
						n(
							"li",
							{
								class: "demo-item",
							},
							todo,
						),
					),
				),
				n(
					"fieldset",
					{
						class: "demo-controls",
					},
					[
						n("input", {
							class: "demo-input",
							value: state.input,
							input: (event) => (state.input = event.target.value),
						}),
						n(
							"button",
							{
								class: "demo-button",
								click: () => {
									if (state.input.trim()) {
										state.todos.push(state.input.trim());
										state.input = "";
									}
								},
							},
							"Add",
						),
					],
				),
			]),
		{ todos: ["Hello there!", "General Kenobi."], input: "" },
	);
};

// Setup when document is ready.
if (
	document.readyState === "complete" ||
	document.readyState === "interactive"
) {
	setup();
} else {
	document.addEventListener("DOMContentLoaded", setup, {
		once: true,
		passive: true,
	});
}

/**
 * Set a piece of text to the devices clipboard.
 * @param {string} text Text to set in the clipboard.
 */
window.copyToClipboard = (text) => {
	// Create element and set content.
	const element = document.createElement("textarea");
	element.value = text;
	document.body.append(element);

	// Select element's content.
	element.select();
	element.setSelectionRange(0, 999999);

	// Copy to clipboard.
	document.execCommand("copy");

	// Remove element.
	element.remove();
};
