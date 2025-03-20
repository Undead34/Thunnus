export async function GET() {
  const healthData = {
    status: "ok",
    version: "1.0.0",
    uptime: process.uptime(),
  };

  return new Response(JSON.stringify(healthData), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
