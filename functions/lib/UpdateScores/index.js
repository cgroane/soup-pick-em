"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const v1_1 = require("firebase-functions/v1");
exports.default = {
    updateScores: async () => {
        try {
            const res = await fetch(`${process.env.REACT_APP_PROD_API_URL}/cron/update-scores`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-cron-secret": `${process.env.CLOUD_CRON_SECRET}`,
                },
            });
            v1_1.logger.log(res);
            return;
        }
        catch (error) {
            v1_1.logger.error("Error updating scores:", error);
            return;
        }
    },
};
// setInterval(() => updateScores(), 10000)
//# sourceMappingURL=index.js.map