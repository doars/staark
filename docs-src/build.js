import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as buildScript } from "esbuild";

import renderIndexPage from "./src/pages/index.js";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(sourceDirectory, "../docs");

const build = async () => {
	const outputEntries = await readdir(outputDirectory, {
		withFileTypes: true,
	}).catch(() => []);

	for (const outputEntry of outputEntries) {
		await rm(path.join(outputDirectory, outputEntry.name), {
			force: true,
			recursive: true,
		});
	}

	await mkdir(outputDirectory, {
		recursive: true,
	});

	await Promise.all([
		writeFile(path.join(outputDirectory, "index.html"), renderIndexPage()),
		cp(path.join(sourceDirectory, "src/assets"), outputDirectory, {
			recursive: true,
		}),
		cp(path.join(sourceDirectory, "src/styles"), outputDirectory, {
			recursive: true,
		}),
		buildScript({
			bundle: true,
			define: {
				"process.env.NODE_ENV": JSON.stringify(
					process.env.NODE_ENV || "development",
				),
			},
			entryPoints: [path.join(sourceDirectory, "src/scripts/index.js")],
			format: "iife",
			minify: process.env.NODE_ENV === "production",
			outfile: path.join(outputDirectory, "index.js"),
			sourcemap: process.env.NODE_ENV !== "production",
		}),
	]);

	console.log("Documentation built");
};

await build();
