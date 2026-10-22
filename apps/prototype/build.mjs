// Bundles the prototype into dist/: index.html (artifact page body) + app.js.
import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: "dist/app.js",
  logLevel: "warning",
});
copyFileSync("src/index.html", "dist/index.html");
console.log("built dist/index.html + dist/app.js");
