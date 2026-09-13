const net = require("net");

function testPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);
    socket.on("connect", () => {
      console.log(`✓ Successfully connected to ${host}:${port}`);
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      console.log(`✗ Timeout connecting to ${host}:${port}`);
      socket.destroy();
      resolve(false);
    });
    socket.on("error", (err) => {
      console.log(`✗ Error connecting to ${host}:${port} - ${err.message}`);
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function check() {
  console.log("Testing network connectivity to Supabase pooler...");
  await testPort("aws-0-ap-south-1.pooler.supabase.com", 6543);
  await testPort("aws-0-ap-south-1.pooler.supabase.com", 5432);
}

check();
