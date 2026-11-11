const os = require("node:os");
const preload = "--require=./scripts/tsx-os-bootstrap.cjs";
if (!process.env.NODE_OPTIONS?.includes("./scripts/tsx-os-bootstrap.cjs")) {
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} ${preload}`.trim();
}

try {
  os.userInfo();
} catch {
  const username = process.env.USERNAME || process.env.USER || os.hostname();

  os.userInfo = () => ({
    username,
    uid: -1,
    gid: -1,
    shell: null,
    homedir: os.homedir(),
  });
}
