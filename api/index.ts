import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path, { dirname } from 'path';
import { client, SeasonType } from 'cfbd';
import { fileURLToPath } from 'url';
import updateScores from "./routes/update-score";
import oddsRouter from "./routes/odds";
import matchupsRouter from "./routes/matchups";
import admin from "firebase-admin";
import adminRouter from './routes/admin';
import groupsRouter from './routes/groups';
import axios from 'axios';
import { SeasonDetailsData } from 'api/schema/sportsDataIO';
// import { theOddsInstance } from '@/api';

export interface CFBDRequestQuery {
  year: string;
  week: string;
  seasonType: SeasonType;
}

const env = process.env.NODE_ENV ?? 'development';

dotenv.config({ path: path.resolve(`.env`) });
dotenv.config({ path: path.resolve(`.env.${env}`), override: true });
dotenv.config({ path: path.resolve(`.env.local`), override: true });
dotenv.config({ path: path.resolve(`.env.${env}.local`), override: true });

const firebaseConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string) as {
  project_id: string;
  client_email: string;
  private_key: string;
};

export const fbApp = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: firebaseConfig.project_id,
    clientEmail: firebaseConfig.client_email,
    privateKey: firebaseConfig.private_key.replace(/\\n/g, '\n'),
  })
});

// Match the client SDK (src/firebase/index.ts): drop `undefined` fields on
// write instead of throwing. The cron writes fresh CFBD game data with optional
// ranks (apRank/playoffRank/coachesRank) that are undefined for unranked teams.
// Must run before any getFirestore() use — safe here at module init.
admin.firestore().settings({ ignoreUndefinedProperties: true });


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



const port = process.env.PORT || 3001;

client.setConfig({
  headers: {
    "Authorization": `Bearer ${process.env.REACT_APP_CFBD_API_KEY}`
  }
})

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/api/cron", updateScores);
app.use("/api/betting", oddsRouter);
app.use("/api/game-data", matchupsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/groups", groupsRouter);

app.get(`/api/current-week`, async (_req: express.Request, res: express.Response) => {
  try {
    const currentSeasonDetails = await axios.get<SeasonDetailsData>(`https://api.sportsdata.io/v3/cfb/scores/json/CurrentSeasonDetails`, {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.REACT_APP_MATCHUPS_API_KEY ?? '',
      }
    });
    const data = currentSeasonDetails.data;
    // Canonical seasonType is the lowercase CFBD vocabulary ('regular' |
    // 'postseason' | 'offseason') declared on SeasonDetailsData. Preseason is
    // collapsed into 'offseason'. Downstream consumers (CFBD queries,
    // SelectWeek, fetchMatchups, Profile) all compare against these lowercase
    // words, so returning the uppercase SeasonTypes enum here silently breaks
    // every one of them (e.g. CFBD returns no games for seasonType=REGULAR).
    const seasonType: SeasonDetailsData['seasonType'] =
      data.ApiSeason.includes('OFF') || data?.ApiSeason?.includes('PRE')
        ? 'offseason'
        : data.ApiSeason.includes('POST')
          ? 'postseason'
          : 'regular';
    res.status(200).json({
      ...data,
      /**
       * local mock data
      ApiWeek: 5,
      Season: 2024,
      EndYear: 2025,
      StartYear: 2024,
      ApiSeason: "2024",
      Description: "2024",
      isOffseason: true,
      seasonType: "regular",
       */
      isOffseason: seasonType === 'offseason',
      seasonType,
    });
    return;
  } catch (err) {
    res.status(500).send(err)
  }
});

const root = path.join(__dirname, '../build');
app.use(express.static(root));
app.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET' && req.accepts('html') && !req.is('json') && !req.path.includes('.')) {
    res.sendFile('index.html', { root })
  } else next()
}).use(cors());

app.listen(port, () => {
  console.log(`Listening on port: ${port}`);
});