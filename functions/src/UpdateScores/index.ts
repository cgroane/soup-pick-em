import {logger} from "firebase-functions/v1";
export default {
  updateScores: async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_PROD_API_URL}/cron/update-scores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": `${process.env.CLOUD_CRON_SECRET}`,
        },
      });
      logger.log(res);
      return;
    } catch (error) {
      logger.error("Error updating scores:", error);
      return;
    }
  },
};

// setInterval(() => updateScores(), 10000)

