import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("dist");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".webp": "image/webp",
};
const headersFile = await readFile(resolve(root, "_headers"), "utf8");
const csp = headersFile
  .match(/Content-Security-Policy: (.+)/)?.[1]
  .replace("; upgrade-insecure-requests", "");
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    let file = resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    let body;
    try {
      body = await readFile(file);
    } catch {
      if (extname(pathname)) {
        response.writeHead(404).end();
        return;
      }
      file = resolve(root, "index.html");
      body = await readFile(file);
    }
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      ...(csp ? { "Content-Security-Policy": csp } : {}),
    });
    response.end(body);
  } catch {
    response.writeHead(400).end();
  }
});
server.listen(Number(process.env.PORT || 8765), "127.0.0.1", () =>
  console.log(`Preview: http://127.0.0.1:${server.address().port}`),
);
