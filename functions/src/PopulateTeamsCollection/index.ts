import {getFirestore} from "firebase-admin/firestore";
import {convertKeyNames} from "../utils/convertKeyNames";
import {logger} from "firebase-functions/v1";
import {Team} from "../types";

export default {
  populateTeams: async () => {
    try {
      logger.log(process.env.REACT_APP_MATCHUPS_API_KEY);
      const response = await fetch(`https://api.sportsdata.io/v3/cfb/scores/json/Teams?key=${process.env.REACT_APP_MATCHUPS_API_KEY}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });
      logger.log(response);

      if (!response.ok) {
        throw new Error("HTTP ERROR");
      }
      const data: Team[] = await response.json().then((json) => convertKeyNames<Team>(json));

      const db = getFirestore();
      const batch = db.batch();
      const collectionRef = db.collection("teams");
      data.forEach((t) => {
        const docRef = collectionRef.doc();
        batch.set(docRef, t);
      });
      await batch.commit();
    } catch (err) {
      throw new Error("Http error. status: " + err);
    }
  },
};
