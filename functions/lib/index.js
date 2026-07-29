"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const UpdateScores_1 = require("./UpdateScores");
(0, app_1.initializeApp)();
exports.updateScores = (0, scheduler_1.onSchedule)("00 12 * * TUE", UpdateScores_1.default.updateScores);
//# sourceMappingURL=index.js.map