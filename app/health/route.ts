export const dynamic = "force-dynamic";
export async function GET() {
  const m = process.memoryUsage();
  return Response.json(
    {
      status: "ok",
      service: "smart-health-monitor",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      memory: {
        rssMb: +(m.rss / 1048576).toFixed(2),
        heapUsedMb: +(m.heapUsed / 1048576).toFixed(2),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
