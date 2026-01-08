import { spawn } from "node:child_process";

const isWin = process.platform === "win32";
const cmd = isWin ? "cmd.exe" : "bash";
const args = isWin
  ? ["/c", "scripts\\run-agent.bat"]
  : ["./scripts/run-agent.sh"];

const p = spawn(cmd, args, { stdio: "inherit" });
p.on("exit", (code) => process.exit(code ?? 0));
