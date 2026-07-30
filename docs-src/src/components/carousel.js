// Import renderer.
import { render as r } from "../utils/RenderUtils.js";

/**
 * Renders a carousel component.
 * @param {object} options Component options:
 * - {string} align = 'center' - Alignment of the carousel contents.
 * - {boolean} alignOnHover = false - Whether to rotate the cards when not hovering over them.
 * @param {...string} children Rendered elements to add as children.
 * @returns {string} Resulting HTML structure.
 */
export default (options, ...children) => {
	options = Object.assign(
		{
			align: "center",
			alignOnHover: false,
		},
		options,
	);

	// Flatten contents.
	children = children.flat(4);

	return r(
		"div",
		{
			class: "reel",
		},
		[
			r(
				"div",
				{
					class: "reel-inner",
				},
				[
					r(
						"ul",
						{
							class: "reel-list",
							"data-align": options.align.toLowerCase(),
						},
						[
							...children.map((content, index) => {
								let tilt;
								if (options.alignOnHover) {
									tilt = "right";
									index = index % 3;
									if (index === 1 || (index === 2 && Math.random() < 0.5)) {
										tilt = "left";
									}
								}

								return r(
									"div",
									{
										class: "reel-item",
										"data-tilt": tilt,
									},
									content,
								);
							}),
						],
					),
				],
			),
		],
	);
};
