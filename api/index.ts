import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path, { dirname } from 'path';
import { client, SeasonType, getGames, getRankings, getLines, getFbsTeams, DivisionClassification } from 'cfbd';
import { fileURLToPath } from 'url';
// import { theOddsInstance } from '@/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


interface CFBDRequestQuery {
  year: string;
  week: string;
  seasonType: SeasonType;
}

dotenv.config({ path: path.resolve('.env') });

const port = process.env.PORT || 3001;

client.setConfig({
  headers: {
    "Authorization": `Bearer ${process.env.REACT_APP_CFBD_API_KEY}`
  }
})

const app = express();
app.use(cors());
app.use(bodyParser.json());


app.get('/api/games', async (req: express.Request<any, any, any, CFBDRequestQuery>, res: express.Response) => {
  try {
    const opts = {
      'division': 'fbs',
      'classification': 'fbs' as DivisionClassification,
      'week': parseInt(req.query.week),
      'seasonType': req.query.seasonType
    }
    const games = await getGames({
      query: {
        year: parseInt(req.query.year),
        ...opts
      }
    });
    res.status(200).json(games.data);
    return
  } catch (err) {
    res.status(500).json(err)
  }
});

app.get('/api/rankings', async (req: express.Request<{}, {}, {}, CFBDRequestQuery>, res: express.Response) => {
  try {
    const opts = {
      'week': parseInt(req.query.week),
      'seasonType': req.query.seasonType
    };
    const rankings = await getRankings({
      query: {
        year: parseInt(req.query.year),
        ...opts
      }
    });
    if (rankings?.data?.[0]?.polls.map((p) => p.poll).includes("Playoff Committee Rankings")) {
      res.status(200).json(rankings?.data?.[0].polls.find((p) => p.poll === "Playoff Committee Rankings"));
    } else {
      res.status(200).json(rankings?.data?.[0]?.polls.find((p) => p.poll === 'AP Top 25'));
    };
    return;
  } catch (err) {
    console.error(err)
    res.status(500).send(err)
  }
});

app.get('/api/odds', async (req: express.Request<{}, {}, {}, {
  week?: string;
  year?: string;
  seasonType?: SeasonType;
}>, res: express.Response) => {
  try {
    const odds = await getLines({
      query: {
        week: req.query.week ? parseInt(req.query.week) : undefined,
        year: req.query.year ? parseInt(req.query.year) : undefined,
        seasonType: req.query.seasonType as SeasonType | undefined,
      }
    });
    res.status(200).json(odds.data);
    return;
  } catch (err) {
    res.status(500).send(err)
  }
});

app.get('/api/teams', async (_req: express.Request, res: express.Response) => {
  try {
    const teams = await getFbsTeams();
    res.status(200).json(teams.data);
    return;
  } catch (err) {
    res.status(500).send(err)
  }
});

app.get("/api/matchups", async (req: express.Request<{}, {}, {}, {
  weekNumber?: string;
  year: string;
  seasonType?: SeasonType;
}>, res: express.Response) => {
  try {
    const [_games, rankings, _spreads, _teams] = await Promise.all([
      getGames({
        query: {
          week: req.query.weekNumber ? parseInt(req.query.weekNumber) : undefined,
          year: req.query.year ? parseInt(req.query.year) : undefined,
          seasonType: req.query.seasonType as SeasonType | undefined,
        }
      }),
      getRankings({
        query: {
          week: req.query.weekNumber ? parseInt(req.query.weekNumber) : undefined,
          year: Number(req.query.year),
          seasonType: req.query.seasonType as SeasonType | undefined,
        }
      }),
      getLines({
        query: {
          week: req.query.weekNumber ? parseInt(req.query.weekNumber) : undefined,
          year: req.query.year ? parseInt(req.query.year) : undefined,
          seasonType: req.query.seasonType as SeasonType | undefined,
        }
      }),
      getFbsTeams()
    ]);
    const rankPropAccessor = rankings?.data?.[0]?.polls?.[0]?.poll === "Playoff Committee Rankings" ? 'playoffRank' : 'apRank';
    console.log(rankPropAccessor);
  } catch (err) {
    res.status(500).send(err);
  }
})

// app.get(`/api/odds`, async (req: express.Request<{}, {}, {
//   weekNumber?: string;
//   season?: string;
//   bookmakers?: string;
//   markets?: string;
//   commenceTimeFrom?: string
//   commenceTimeTo?: string;
//   event?: string;
//   date?: string;
//   seasonType?: string;
//   historical?: string;
// }>, res: express.Response) => {
//   try {
//     const odds = await theOddsInstance.get(`${req.query.historical || process.env.REACT_APP_SEASON_KEY === "offseason" ? 'historical/' : ''}sports/americanfootball_ncaaf/odds`, {
//       params: {
//         ...req.query,
//         apiKey: process.env.REACT_APP_THE_ODDS_API_KEY,
//         regions: 'us',
//         markets: req.query.markets ?? 'spreads',
//       }
//     });
//     res.status(200).json(odds.data.data);
//   } catch (err) {
//     res.status(500).send(err)
//   }
// })

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