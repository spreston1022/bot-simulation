import { CustomRateLimitDetails, ZuploContext, ZuploRequest } from "@zuplo/runtime";

export async function rateLimitKey(
  request: ZuploRequest,
  context: ZuploContext,
): Promise<CustomRateLimitDetails> {
  const tlsFingerprint = request.headers.get("client-tls-fingerprint");
  const botScoreHeader = request.headers.get("x-bot-score");

  if (!botScoreHeader) {
    return {
      key: `unknown-${tlsFingerprint ?? "unknown"}`,
      requestsAllowed: 50,
      timeWindowMinutes: 0.1,
    };
  }

  const botScore = parseInt(botScoreHeader, 10);
  context.log.info({ botScore, tlsFingerprint });

  // 0–50: 50 req / 0.1 min
  if (botScore <= 50) {
    return {
      key: `low-${tlsFingerprint ?? "unknown"}`,
      requestsAllowed: 50,
      timeWindowMinutes: 0.1,
    };
  }

  // 50–75: 20 req / 0.1 min
  if (botScore <= 75) {
    return {
      key: `medium-${tlsFingerprint ?? "unknown"}`,
      requestsAllowed: 10,
      timeWindowMinutes: 0.1,
    };
  }

  // 75–100: 5 req / 0.1 min
  return {
    key: `high-${tlsFingerprint ?? "unknown"}`,
    requestsAllowed: 5,
    timeWindowMinutes: 0.1,
  };
}
