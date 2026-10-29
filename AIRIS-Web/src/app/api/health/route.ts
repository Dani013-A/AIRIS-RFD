import { NextResponse } from "next/server";
import { getAdminApiBaseUrl } from "../../../config/api";

export async function GET() {
  const backendBase = getAdminApiBaseUrl();
  try {
    const res = await fetch(`${backendBase}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          status: "degraded",
          aiServiceStatus: "degraded",
          serverStatus: "degraded",
          httpStatus: res.status,
          service: "AIRIS SBERT Evaluator API",
        },
        { status: 200 }
      );
    }

    const data = await res.json().catch(() => ({}));
    const isHealthy = data.status === "running" || data.health === "healthy";

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "degraded",
        aiServiceStatus: isHealthy ? "healthy" : "degraded",
        serverStatus: "operational",
        service: data.service || "AIRIS SBERT Evaluator API",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "offline",
        aiServiceStatus: "offline",
        serverStatus: "unavailable",
        service: "AIRIS SBERT Evaluator API",
        error: error instanceof Error ? error.message : "Health check timed out or unreachable",
      },
      { status: 200 }
    );
  }
}
