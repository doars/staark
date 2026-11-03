import { build, context } from "esbuild";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const isProduction = process.env.NODE_ENV === "production";

export default async (bundles) => {
	const bundleOptions = bundles.map((options) => {
    if (!options.entryPoints || !options.outfile) {
      throw new Error(
        "Bundle options are missing entryPoints or outfile properties.",
      );
    }

    return {
      define: {
        "process.env.NODE_ENV": '"development"',
      },
      bundle: true,
      format: options.format || "esm",
      minify: false,
      sourcemap: "linked",
      entryPoints: Array.isArray(options.entryPoints)
        ? options.entryPoints
        : [options.entryPoints],
      outfile: path.join(process.cwd(), options.outfile),
      external: options.external || [],
    };
  });

  if (!isProduction) {
    const contexts = await Promise.all(
      bundleOptions.map((options) => context(options)),
    );
    console.log("Bundles build");
    console.log("Watching for file changes...");

    await Promise.all(contexts.map(context => context.watch()));
    return;
  }

  const extraBundles = bundleOptions.map((options) => {
    const outfileParsed = path.parse(options.outfile);
    const outfile = options.outfile.substring(0, options.outfile.length - outfileParsed.ext.length) +'.min' + outfileParsed.ext

    return {
      ...options,
      define: {
        ...(options.define ?? {}),
        "process.env.NODE_ENV": '"production"',
      },
      drop: ["console", "debugger"],
      minify: true,
      sourcemap: false,
      outfile: outfile,
    };
  });
  bundleOptions.push(...extraBundles);

  await Promise.all(
    bundleOptions.map(async (options) => {
      try {
        await build(options);

        if (options.minify) {
          const gzipPath = `${options.outfile}.gz`;
          const brotliPath = `${options.outfile}.br`;

          await Promise.all([
            fs.rm(gzipPath).catch(() => {}),
            fs.rm(brotliPath).catch(() => {}),
          ]);

          await Promise.all([
            execFileAsync("gzip", ["-k", options.outfile]),
            execFileAsync("brotli", [options.outfile]),
          ]);

          let gzipSize = (await fs.stat(gzipPath)).size;
          gzipSize = `${(gzipSize / 1024).toFixed(2)}KB`;

          let brotliSize = (await fs.stat(brotliPath)).size;
          brotliSize = `${(brotliSize / 1024).toFixed(2)}KB`;

          await Promise.all([
            fs.rm(gzipPath).catch(() => {}),
            fs.rm(brotliPath).catch(() => {}),
          ]);

          console.log(
            `${path.basename(options.outfile)} is build. \x1b[1m${gzipSize}\x1b[0m gzipped, \x1b[1m${brotliSize}\x1b[0m brotli compressed.`,
          );
        } else {
          console.log(`${path.basename(options.outfile)} is build.`);
        }
      } catch (error) {
        console.error(
          "Build failed for",
          options.outfile,
          error,
        );
      }
    }),
  );

  console.log("Bundles build");
};
