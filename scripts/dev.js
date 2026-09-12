// KisanJod - Dynamic Network Dev Server Launcher
// Automatically detects active Wi-Fi, Ethernet, or Hotspot network interfaces
// dynamically every time 'npm run dev' is started, and cleans any stale port 3000.

const os = require("os");
const path = require("path");
const fs = require("fs");
const { spawn, execSync } = require("child_process");

function freePort(p) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${p} | findstr LISTENING`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const lines = output.trim().split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && pid !== String(process.pid)) {
          console.log(`  🧹 Terminated stale process holding port ${p} (PID ${pid})`);
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        }
      }
    }
  } catch {
    // Port is free, nothing to kill
  }
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      const isIPv4 = iface.family === "IPv4" || iface.family === 4;
      if (isIPv4 && !iface.internal) {
        if (!iface.address.startsWith("169.254.")) {
          addresses.push({
            name,
            address: iface.address,
          });
        }
      }
    }
  }

  return addresses;
}

const port = process.env.PORT || 3000;

// Ensure port is free before starting
freePort(port);

const localIps = getLocalIpAddresses();

console.log("\n" + "=".repeat(60));
console.log("  🌾 KisanJod - Digital Procurement & Mandi Platform");
console.log("=".repeat(60));
console.log(`  - Local:        http://localhost:${port}`);

if (localIps.length === 0) {
  console.log(`  - Network:      (No active non-internal IPv4 network detected)`);
} else {
  localIps.forEach((item) => {
    const label = localIps.length > 1 ? `  - Network [${item.name}]:` : `  - Network URL:  `;
    console.log(`${label} http://${item.address}:${port}  <-- Access from Phone / Tablet`);
  });
}
console.log("=".repeat(60));
console.log("  💡 Tip: Ensure your mobile device is on the same Wi-Fi / Hotspot.");
console.log("  💡 If blocked on Windows, ensure port " + port + " is allowed in Windows Firewall.");
console.log("=".repeat(60) + "\n");

// Resolve Next.js binary
const localBin = path.join(__dirname, "..", "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
const cmd = fs.existsSync(localBin) ? localBin : (process.platform === "win32" ? "npx.cmd" : "npx");
const args = fs.existsSync(localBin)
  ? ["dev", "-H", "0.0.0.0", "-p", String(port)]
  : ["next", "dev", "-H", "0.0.0.0", "-p", String(port)];

const nextProc = spawn(cmd, args, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    PORT: String(port),
  },
});

nextProc.on("error", (err) => {
  console.error("Failed to start Next.js dev server:", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  nextProc.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  nextProc.kill("SIGTERM");
  process.exit(0);
});
