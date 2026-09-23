import { preview } from "vite";
import { spawn } from "node:child_process";
const server = await preview({
  preview: { host: "127.0.0.1", port: 5188, strictPort: true },
});
try {
  const child = spawn(process.execPath, ["scripts/check-web-integration.mjs"], {
    stdio: "inherit",
  });
  const code = await new Promise((resolve) => child.on("exit", resolve));
  if (code) process.exitCode = code;
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
}
