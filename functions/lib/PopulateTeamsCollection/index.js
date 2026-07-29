"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("firebase-admin/firestore");
const convertKeyNames_1 = require("../utils/convertKeyNames");
const v1_1 = require("firebase-functions/v1");
exports.default = {
    populateTeams: async () => {
        try {
            v1_1.logger.log(process.env.REACT_APP_MATCHUPS_API_KEY);
            const response = await fetch(`https://api.sportsdata.io/v3/cfb/scores/json/Teams?key=${process.env.REACT_APP_MATCHUPS_API_KEY}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
                signal: AbortSignal.timeout(30000),
            });
            v1_1.logger.log(response);
            if (!response.ok) {
                throw new Error("HTTP ERROR");
            }
            const data = await response.json().then((json) => (0, convertKeyNames_1.convertKeyNames)(json));
            const db = (0, firestore_1.getFirestore)();
            const batch = db.batch();
            const collectionRef = db.collection("teams");
            data.forEach((t) => {
                const docRef = collectionRef.doc();
                batch.set(docRef, t);
            });
            await batch.commit();
        }
        catch (err) {
            throw new Error("Http error. status: " + err);
        }
    },
};
//# sourceMappingURL=index.js.map