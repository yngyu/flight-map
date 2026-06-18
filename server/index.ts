import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";
import { resolveFlightResources } from "./flightResources.js";
import type { FlightResourcesRequest } from "../src/lib/flightResourceTypes.js";

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";
const projectRoot = process.cwd();
const distDirectory = resolve(projectRoot, "dist");
const indexHtmlPath = join(distDirectory, "index.html");
const maxRequestBytes = 512 * 1024;

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error: unknown) => {
    console.error(error);
    writeJson(response, 500, { error: "Internal server error" });
  });
});

server.listen(port, host, () => {
  console.log(`flight-map server listening on http://${host}:${port}`);
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const requestUrl = getRequestUrl(request);

  if (requestUrl === null) {
    writeJson(response, 400, { error: "Invalid request URL" });
    return;
  }

  if (requestUrl.pathname === "/api/healthz") {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname === "/api/flight-resources") {
    await handleFlightResourcesRequest(request, response);
    return;
  }

  await serveStaticAsset(request, response, requestUrl.pathname);
}

async function handleFlightResourcesRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    writeJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readRequestBody(request);
  const parsedBody = parseJson(body);

  if (parsedBody === null) {
    writeJson(response, 400, { error: "Invalid JSON" });
    return;
  }

  const flightResourcesRequest = toFlightResourcesRequest(parsedBody);

  if (flightResourcesRequest === null) {
    writeJson(response, 400, { error: "Invalid flight resource request" });
    return;
  }

  writeJson(response, 200, await resolveFlightResources(flightResourcesRequest));
}

async function serveStaticAsset(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    writeText(response, 405, "Method not allowed");
    return;
  }

  const assetPath = resolveAssetPath(pathname);

  if (assetPath === null) {
    writeText(response, 403, "Forbidden");
    return;
  }

  const resolvedPath = await resolveReadableAssetPath(assetPath);

  if (resolvedPath === null) {
    writeText(response, 404, "Not found");
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", contentTypeForPath(resolvedPath));

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(resolvedPath).pipe(response);
}

async function resolveReadableAssetPath(assetPath: string): Promise<string | null> {
  const asset = await fileStat(assetPath);

  if (asset?.isFile() === true) {
    return assetPath;
  }

  if (extname(assetPath).length === 0) {
    const indexHtml = await fileStat(indexHtmlPath);

    if (indexHtml?.isFile() === true) {
      return indexHtmlPath;
    }
  }

  return null;
}

async function fileStat(pathname: string): Promise<Awaited<ReturnType<typeof stat>> | null> {
  try {
    return await stat(pathname);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function resolveAssetPath(pathname: string): string | null {
  const decodedPathname = decodeURIComponent(pathname);
  const relativePathname = decodedPathname === "/" ? "index.html" : decodedPathname.slice(1);
  const resolvedPath = resolve(distDirectory, relativePathname);

  if (!isPathInsideDirectory(resolvedPath, distDirectory)) {
    return null;
  }

  return resolvedPath;
}

function isPathInsideDirectory(pathname: string, directory: string): boolean {
  return pathname === directory || pathname.startsWith(`${directory}/`);
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    totalBytes += buffer.byteLength;

    if (totalBytes > maxRequestBytes) {
      throw new Error("Request body is too large");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function toFlightResourcesRequest(value: unknown): FlightResourcesRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isStringArray(value.airportCodes) || !isStringArray(value.airlines)) {
    return null;
  }

  return {
    airportCodes: value.airportCodes,
    airlines: value.airlines,
  };
}

function getRequestUrl(request: IncomingMessage): URL | null {
  if (request.url === undefined) {
    return null;
  }

  return new URL(request.url, "http://localhost");
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function writeText(response: ServerResponse, statusCode: number, body: string): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end(body);
}

function parseJson(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch (error: unknown) {
    console.warn("Invalid JSON request body.", error);
    return null;
  }
}

function contentTypeForPath(pathname: string): string {
  const extension = extname(pathname);

  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }

  if (extension === ".js") {
    return "text/javascript; charset=utf-8";
  }

  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }

  if (extension === ".csv") {
    return "text/csv; charset=utf-8";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".svg") {
    return "image/svg+xml";
  }

  return "application/octet-stream";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
