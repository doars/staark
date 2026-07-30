// Import components.

// Import renderer.
import { render as r } from "../utils/RenderUtils.js";
import code from "./code.js";

/**
 * Renders a code window component.
 * @param {object} options Component options, see code component options.
 * @param {...string} children Rendered elements to add as children.
 * @returns {string} Resulting HTML structure.
 */
export default (options, ...children) => {
	return r(
		"div",
		{
			class: "code-window",
		},
		[
			r(
				"div",
				{
					class: "code-window-bar",
				},
				[
					r("span", {
						class: "code-window-dot",
						"data-tone": "dark",
					}),
					r("span", {
						class: "code-window-dot",
						"data-tone": "light",
					}),
					r("span", {
						class: "code-window-dot",
						"data-tone": "medium",
					}),
				],
			),
			r(
				"div",
				{
					class: "code-window-content code-dark",
				},
				code(options, ...children),
			),
		],
	);
};
