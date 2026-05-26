import { ZoneCache, ZuploContext, ZuploRequest } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  const cache = new ZoneCache("overall-rate-bot-block", context);

  // 6-second bucket key (0.1 min) — resets naturally each window
  const bucket = Math.floor(Date.now() / 6000);
  const countKey = `overall-count:${bucket}`;

  const current = (await cache.get<number>(countKey)) ?? 0;

  // Increment counter — TTL of 15s ensures it outlives the 6s window
  cache.put(countKey, current + 1, 15);

  let botScoreThreshold: number | null = null;
  if (current >= 100) {
    botScoreThreshold = 25;
  } else if (current >= 75) {
    botScoreThreshold = 50;
  }

  if (botScoreThreshold !== null) {
    const botScoreHeader = request.headers.get("x-bot-score");
    if (botScoreHeader) {
      const score = parseInt(botScoreHeader, 10);
      if (!isNaN(score) && score > botScoreThreshold) {
        context.log.info(
          { score, current, botScoreThreshold },
          "blocking high bot score under elevated traffic",
        );
        return new Response(
          JSON.stringify({ error: "Too Many Requests", retryAfter: 60 }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
            },
          },
        );
      }
    }
  }

  return request;
}
