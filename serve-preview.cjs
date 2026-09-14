const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "dist", "build", "h5");
const portArg = process.argv.indexOf("--port");
const baseArg = process.argv.indexOf("--base");
const port = Number(portArg >= 0 ? process.argv[portArg + 1] : process.env.BINSEN_PREVIEW_PORT || 5197);
const previewBase = baseArg >= 0 ? process.argv[baseArg + 1] : "";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function resolveFile(requestUrl) {
  let pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  if (previewBase && pathname.startsWith(previewBase)) pathname = pathname.slice(previewBase.length) || "/";
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = path.resolve(root, relativePath);
  return candidate.startsWith(root) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    ? candidate
    : path.join(root, "index.html");
}

const server = http.createServer((request, response) => {
  try {
    const file = resolveFile(request.url || "/");
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
    });
    fs.createReadStream(file).pipe(response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Preview server error");
    console.error(error);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`BINSEN static preview: http://127.0.0.1:${port}${previewBase || "/"}`);
});
