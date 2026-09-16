import {initializeApp} from "firebase-admin/app";
import {onSchedule} from "firebase-functions/v2/scheduler";
import UpdateScores from "./UpdateScores";

initializeApp();

exports.updateScores = onSchedule(
  {schedule: "00 22 * * TUE", timeZone: "America/Chicago"},
  UpdateScores.updateScores
);
