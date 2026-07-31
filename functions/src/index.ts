import {initializeApp} from "firebase-admin/app";
import {onSchedule} from "firebase-functions/v2/scheduler";
import UpdateScores from "./UpdateScores";

initializeApp();

exports.updateScores = onSchedule("00 12 * * TUE", UpdateScores.updateScores);
