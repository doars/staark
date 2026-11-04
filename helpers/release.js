// Publishes every package whose version is higher than the latest version on npm.
//
// Usage: npm run release -- [package ...] [--dry-run]
//
// Without package names every package in `packages/` is checked. Packages are published after the packages they depend on. With `--dry-run` all checks run and `npm publish --dry-run` is used, so nothing is uploaded.

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const requested = args.filter((arg) => !arg.startsWith("--"));

const run = (command, commandArgs, options = {}) => {
	const result = spawnSync(command, commandArgs, {
		cwd: options.cwd ?? root,
		encoding: "utf8",
		stdio: options.inherit ? "inherit" : "pipe",
	});
	if (result.status !== 0) {
		throw new Error(
			`${command} ${commandArgs.join(" ")} failed${result.stderr ? `:\n${result.stderr}` : ""}`,
		);
	}
	return result.stdout?.trim() ?? "";
};

// Compares two versions, returns a negative number, zero or a positive number. A prerelease is lower than the release it leads up to.
const compareVersions = (a, b) => {
	const [aCore, aPre] = a.split("-");
	const [bCore, bPre] = b.split("-");
	const aParts = aCore.split(".").map(Number);
	const bParts = bCore.split(".").map(Number);
	for (let index = 0; index < 3; index++) {
		if (aParts[index] !== bParts[index]) {
			return aParts[index] - bParts[index];
		}
	}
	if (aPre === bPre) {
		return 0;
	}
	if (aPre === undefined || bPre === undefined) {
		return aPre === undefined ? 1 : -1;
	}
	return aPre.localeCompare(bPre, undefined, { numeric: true });
};

const fail = (message) => {
	console.error(`\n✖ ${message}`);
	process.exit(1);
};

// Only release committed work, so the published files match the repository.
if (run("git", ["status", "--porcelain", "--untracked-files=no"])) {
	fail("The working tree has uncommitted changes. Commit or stash them first.");
}
const branch = run("git", ["branch", "--show-current"]);
if (branch !== "main") {
	if (!dryRun) {
		fail(`Releases are made from main, not ${branch}.`);
	}
	console.warn(
		`! On ${branch} instead of main, continuing because of --dry-run.`,
	);
}
// Fail before anything else runs, instead of at the first publish.
if (!dryRun) {
	try {
		run("npm", ["whoami"]);
	} catch {
		fail("Not logged in to npm. Run `npm login` first.");
	}
}

// Read the packages and what is published of them.
const packages = new Map();
for (const directory of await fs.readdir(path.join(root, "packages"))) {
	const manifestPath = path.join(root, "packages", directory, "package.json");
	let manifest;
	try {
		manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
	} catch {
		continue;
	}
	if (manifest.private) {
		continue;
	}
	packages.set(manifest.name, {
		directory: path.join("packages", directory),
		manifest,
	});
}
for (const name of requested) {
	if (
		!packages.has(name) &&
		![...packages.values()].some(
			(entry) => path.basename(entry.directory) === name,
		)
	) {
		fail(`Unknown package: ${name}`);
	}
}

const releases = [];
for (const [name, entry] of packages) {
	if (
		requested.length > 0 &&
		!requested.includes(name) &&
		!requested.includes(path.basename(entry.directory))
	) {
		continue;
	}
	const response = await fetch(
		`https://registry.npmjs.org/${name.replace("/", "%2f")}`,
	);
	if (!response.ok && response.status !== 404) {
		fail(`Could not read ${name} from npm: ${response.status}`);
	}
	const published = response.ok ? await response.json() : null;
	const latest = published?.["dist-tags"]?.latest;
	const version = entry.manifest.version;
	if (published?.versions?.[version]) {
		console.log(`- ${name}@${version} is already published.`);
		continue;
	}
	if (latest && compareVersions(version, latest) <= 0) {
		console.warn(
			`! ${name}@${version} is not higher than ${latest} on npm, skipping.`,
		);
		continue;
	}
	releases.push({ ...entry, latest, name, version });
}

if (releases.length === 0) {
	console.log("\nNothing to release.");
	process.exit(0);
}

// Check every release before publishing any of them.
const releasing = new Map(
	releases.map((release) => [release.name, release.version]),
);
for (const release of releases) {
	const changelog = await fs
		.readFile(path.join(root, release.directory, "CHANGELOG.md"), "utf8")
		.catch(() => "");
	if (!changelog.includes(`\n## ${release.version}\n`)) {
		fail(
			`${release.name} has no "## ${release.version}" heading in its changelog.`,
		);
	}
	if (/\n## Unreleased\n/.test(changelog)) {
		fail(
			`${release.name} still has an "## Unreleased" heading in its changelog.`,
		);
	}

	// A dependency on another package in this repository must be published, or released now, in a version the range allows.
	for (const [dependency, range] of Object.entries(
		release.manifest.dependencies ?? {},
	)) {
		if (!packages.has(dependency) || !/^\^\d/.test(range)) {
			continue;
		}
		const minimum = range.slice(1);
		const available = releasing.get(dependency);
		if (available && compareVersions(available, minimum) >= 0) {
			continue;
		}
		const response = await fetch(
			`https://registry.npmjs.org/${dependency.replace("/", "%2f")}`,
		);
		const published = response.ok ? await response.json() : null;
		if (!published?.versions?.[minimum]) {
			fail(
				`${release.name} needs ${dependency}@${range}, which is not on npm and not part of this release.`,
			);
		}
	}
}

// Publish dependencies before the packages that need them.
const ordered = [];
const visit = (release, chain = []) => {
	if (ordered.includes(release)) {
		return;
	}
	if (chain.includes(release)) {
		fail(
			`Circular dependency: ${[...chain, release].map((entry) => entry.name).join(" → ")}`,
		);
	}
	for (const dependency of Object.keys(release.manifest.dependencies ?? {})) {
		const dependencyRelease = releases.find(
			(entry) => entry.name === dependency,
		);
		if (dependencyRelease) {
			visit(dependencyRelease, [...chain, release]);
		}
	}
	ordered.push(release);
};
for (const release of releases) {
	visit(release);
}

console.log("\nReleasing:");
for (const release of ordered) {
	console.log(
		`  ${release.name} ${release.latest ?? "(new)"} → ${release.version}`,
	);
}

console.log("\nRunning the tests…");
run("npm", ["test"], { inherit: true });

// The published files come from dst/, so it must match a fresh build.
console.log("\nBuilding…");
for (const release of ordered) {
	run("npm", ["run", "build"], { cwd: path.join(root, release.directory) });
}
if (run("git", ["status", "--porcelain", "--untracked-files=no"])) {
	fail(
		"Building changed committed files. Commit the rebuilt distribution files first.",
	);
}

for (const release of ordered) {
	console.log(`\nPublishing ${release.name}@${release.version}…`);
	run("npm", ["publish", ...(dryRun ? ["--dry-run"] : [])], {
		cwd: path.join(root, release.directory),
		inherit: true,
	});
}

console.log(
	dryRun
		? "\n✔ Dry run finished, nothing was published."
		: `\n✔ Published ${ordered.map((release) => `${release.name}@${release.version}`).join(", ")}.`,
);
