import esbuild from "esbuild";

const production = process.argv.includes("--production");
const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", "@lezer/common"],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  platform: "node",
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
