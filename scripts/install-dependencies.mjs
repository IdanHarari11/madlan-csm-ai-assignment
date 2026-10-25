import { spawnSync } from "node:child_process";
import path from "node:path";
import { readExecutionProfile } from "./execution-profile.mjs";

const managed = process.env.SITES_MANAGED_LINUX_CONTAINER === "1" || readExecutionProfile() === "managed-linux";
const result = spawnSync(managed ? "bash" : "npx", managed
  ? ["scripts/install-pnpm.sh"]
  : ["--yes", "pnpm@11.25.0", "install", "--frozen-lockfile"], {
  stdio: "inherit",
  env: { ...process.env,
    npm_config_cache: path.resolve(".sites-runtime/npm-cache"),
    PNPM_HOME: path.resolve(".sites-runtime/pnpm-home"),
    XDG_CACHE_HOME: path.resolve(".sites-runtime/cache"),
  },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
