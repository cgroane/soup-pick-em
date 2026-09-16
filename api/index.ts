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
import mcpRouter from './routes/mcp';
import { wellKnownRouter } from './mcp/oauth';
import { getCurrentSeasonDetails } from './currentWeek';
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
// `WWW-Authenticate` carries the OAuth discovery pointer for MCP clients, and a
// browser-based client cannot read it cross-origin unless it is exposed.
app.use(cors({ exposedHeaders: ["WWW-Authenticate", "Mcp-Session-Id", "MCP-Protocol-Version"] }));
app.use(bodyParser.json());
app.use("/api/cron", updateScores);
app.use("/api/betting", oddsRouter);
app.use("/api/game-data", matchupsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/mcp", mcpRouter);
// RFC 8414 / RFC 9728 define these relative to the origin, so they are
// mounted at the root rather than under /api — a client looks nowhere else.
app.use(wellKnownRouter);

app.get(`/api/current-week`, async (_req: express.Request, res: express.Response) => {
  try {
    res.status(200).json(await getCurrentSeasonDetails());
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