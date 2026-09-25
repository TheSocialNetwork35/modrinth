import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const file of [
  "index.html",
  "styles.css",
  "script.js",
  "_headers",
  "_redirects",
  "assets",
]) {
  await cp(file, `dist/${file}`, { recursive: true });
}
await cp("ui/REACT-BITS-LICENSE.md", "dist/assets/REACT-BITS-LICENSE.md");
await build({
  entryPoints: ["ui/main.jsx"],
  outfile: "dist/assets/ui.js",
  bundle: true,
  minify: true,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "linked",
});
