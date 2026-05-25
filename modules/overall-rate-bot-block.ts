import { ZoneCache, ZuploContext, ZuploRequest } from "@zuplo/runtime";

const OVERALL_THRESHOLD = 50; // req per 0.1 min (6s) before high-score bots are blocked
const BOT_SCORE_THRESHOLD = 75;

export default async function (request: ZuploRequest, context: ZuploContext) {
  const cache = new ZoneCache("overall-rate-bot-block", context);

  // 6-second bucket key (0.1 min) — resets naturally each window
  const bucket = Math.floor(Date.now() / 6000);
  const countKey = `overall-count:${bucket}`;

  const current = (await cache.get<number>(countKey)) ?? 0;

  // Increment counter — TTL of 15s ensures it outlives the 6s window
  cache.put(countKey, current + 1, 15);

  if (current >= OVERALL_THRESHOLD) {
    const botScoreHeader = request.headers.get("x-bot-score");
    if (botScoreHeader) {
      const score = parseInt(botScoreHeader, 10);
      if (!isNaN(score) && score > BOT_SCORE_THRESHOLD) {
        context.log.info(
          { score, current },
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
