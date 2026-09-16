import {logger} from "firebase-functions/v1";

export default {
  updateScores: async () => {
    const baseUrl = process.env.REACT_APP_PROD_API_URL;
    const secret = process.env.CLOUD_CRON_SECRET;

    if (!baseUrl || !secret) {
      logger.error("Missing function env vars — check functions/.env", {
        hasBaseUrl: !!baseUrl,
        hasSecret: !!secret,
      });
      return;
    }

    const url = `${baseUrl}/cron/update-scores`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": secret,
        },
      });
      const body = await res.text();
      if (!res.ok) {
        logger.error("update-scores failed", {url, status: res.status, body});
        return;
      }
      let slate = "unknown";
      try {
        slate = JSON.parse(body).slate ?? "unknown";
      } catch (err) {
        slate = "unparsed";
      }
      logger.log(`update scores ${slate} ok`, {status: res.status, body});
      return;
    } catch (error) {
      logger.error("Error updating scores:", error);
      return;
    }
  },
};
