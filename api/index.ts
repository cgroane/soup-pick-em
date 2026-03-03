import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path, { dirname } from 'path';
import { client, SeasonType, getGames, getRankings, getLines, getFbsTeams, DivisionClassification } from 'cfbd';
import { fileURLToPath } from 'url';

// import admin from "firebase-admin";

// const fbApp = admin.initializeApp({
//   credential: admin.credential.cert({
//     projectId: fbCert.project_id,
//     clientEmail: fbCert.client_email,
//     privateKey: fbCert.private_key.replace(/\\n/g, '\n'),
//   })
// });

import axios from 'axios';
import { SeasonTypes } from '../src/context/ui';
import { SeasonDetailsData } from '../src/api/schema/sportsDataIO';
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
      'seasonType': req.query.seasonType,
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

app.get(`/api/games/:id`, async (req: express.Request<{ id: string }>, res: express.Response) => {
  try {
    const gameId = req.params.id;
    const games = await getGames({
      query: {
        season: new Date().getFullYear(),
        division: 'fbs',
        classification: 'fbs' as DivisionClassification,
        id: Number(gameId)
      }
    });
    const game = games?.data?.[0];
    if (game) {
      res.status(200).json(game);
    } else {
      res.status(404).json({ message: 'Game not found' });
    }
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

// app.get('/api/impersonate', async (req: express.Request, res: express.Response) => {
//   try {
//     const userId = req.query.userId as string;
//     const customToken = await fbApp.auth().createCustomToken(userId);
//     res.json({ customToken });
//   }
//   catch (err) {
//     res.status(500).send('Server error');
//   }
// });


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

app.get(`/api/current-week`, async (_req: express.Request, res: express.Response) => {
  try {
    const currentSeasonDetails = await axios.get<SeasonDetailsData>(`https://api.sportsdata.io/v3/cfb/scores/json/CurrentSeasonDetails`, {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.REACT_APP_MATCHUPS_API_KEY ?? '',
      }
    });
    const data = currentSeasonDetails.data;
    const seasonKeys = {
      'regular': SeasonTypes.REGULAR,
      'postseason': SeasonTypes.POST,
      'offseason': SeasonTypes.OFF,
      'preseason': SeasonTypes.PRE
    };
    let seasonKeyAccessor: keyof typeof seasonKeys = data.ApiSeason.includes('OFF') || data?.ApiSeason?.includes("PRE") ? 'offseason' : data.ApiSeason.includes('POST') ? 'postseason' : 'regular';
    res.status(200).json({
      ...data,
      seasonType: seasonKeys[seasonKeyAccessor],
      isOffseason: seasonKeyAccessor === 'offseason'
    });
    return;
  } catch (err) {
    res.status(500).send(err)
  }
})

app.get("/api/matchups", async (req: express.Request<{}, {}, {}, {
  week?: string;
  year: string;
  seasonType?: SeasonType;
}>, res: express.Response) => {
  try {
    /**
     * get games by week, year, seasontype
     * then sort by data (not necessary anymore since i don't have to request odds by date range)
     * then get rankings, teams, spreads for the same week and year and seasontype if applicable
     * merge for each game, map get hometeamdata, awayteamdata, ranking, spreads (outcomes: {away, home});
     * lines are always in terms of the home team.
     * map game hometeamid to team.id, awayteamid to team.id for teams api
     * map game.id to spread.id
     * return merged data
     */
    const opts = {
      week: req.query.week ? parseInt(req.query.week) : undefined,
      seasonType: req.query.seasonType ?? "regular",
      year: parseInt(req.query.year)
    }
    const [_games, rankings, _spreads, _teams] = await Promise.all([
      getGames({
        query: {
          ...opts
        }
      }),
      getRankings({
        query: {
          ...opts
        }
      }),
      getLines({
        query: {
          ...opts
        }
      }),
      getFbsTeams()
    ]);

    const teamIds = new Set<number>();
    _teams?.data?.forEach((team) => teamIds.add(team.id));

    const rankPropAccessor = rankings?.data?.[0]?.polls?.[0]?.poll === "Playoff Committee Rankings" ? 'playoffRank' : 'apRank';
    const dataArr = _games?.data?.filter((g) => teamIds.has(g.homeId) && teamIds.has(g.awayId)).map((game) => {
      const awayTeamData = _teams?.data?.find((team) => team.id === game.awayId);
      const homeTeamData = _teams?.data?.find((team) => team.id === game.homeId);
      return {
        ...game,
        awayTeamData: {
          ...awayTeamData,
          coachesRank: undefined,
          apRank: undefined,
          playoffRank: undefined,
          [rankPropAccessor]: rankings?.data?.[0]?.polls?.[0]?.ranks?.find((r) => r.teamId === awayTeamData?.id)?.rank
        },
        homeTeamData: {
          ...homeTeamData,
          coachesRank: undefined,
          apRank: undefined,
          playoffRank: undefined,
          [rankPropAccessor]: rankings?.data?.[0]?.polls?.[0]?.ranks?.find((r) => r.teamId === homeTeamData?.id)?.rank
        }
      }
    })
      .map((game) => {
        const line = _spreads?.data?.find((l) => l.id === game.id);
        const dk = line?.lines?.find((l) => l.provider === "DraftKings" || l.provider === "Draft Kings") ?? line?.lines?.[0];
        return {
          ...game,
          pointSpread: dk?.spread,
          outcomes: dk?.spread ? {
            home: {
              name: game.homeTeamData?.school ?? game.homeTeam,
              point: dk?.spread && dk?.spread > 0 ? `+${dk?.spread}` : `${dk?.spread}`,
              pointValue: dk?.spread,
              id: 1
            },
            away: {
              name: game.awayTeamData?.school ?? game.awayTeam,
              point: dk?.spread && dk?.spread < 0 ? `+${-1 * dk?.spread}` : `${-1 * dk?.spread}`,
              pointValue: -1 * dk?.spread,
              id: 2
            }
          } : undefined
        }
      }).filter((g) => !!g.outcomes)
      .filter((g) => opts.seasonType === 'postseason' ? !(g.notes as string)?.includes('College Football Playoff') : true);

    res.status(200).json(dataArr);
    return;
  } catch (err) {
    res.status(500).send(err);
  }
})

app.get('/api/cfp-games', async (req: express.Request<{}, {}, {}, { year?: string }>, res: express.Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const opts = {
      week: 1,
      seasonType: 'postseason' as SeasonType,
      year,
    };

    const [_games, _spreads, _teams] = await Promise.all([
      getGames({ query: opts }),
      getLines({ query: opts }),
      getFbsTeams()
    ]);

    const cfpGames = _games?.data?.filter((g) => (g.notes as string)?.includes('College Football Playoff'));

    const dataArr = cfpGames?.map((game) => {
      const awayTeamData = _teams?.data?.find((team) => team.id === game.awayId);
      const homeTeamData = _teams?.data?.find((team) => team.id === game.homeId);
      return {
        ...game,
        awayTeamData: { ...awayTeamData },
        homeTeamData: { ...homeTeamData },
      };
    }).map((game) => {
      const line = _spreads?.data?.find((l) => l.id === game.id);
      const dk = line?.lines?.find((l) => l.provider === 'DraftKings');
      return {
        ...game,
        pointSpread: dk?.spread,
        outcomes: dk?.spread ? {
          home: {
            name: game.homeTeamData?.school ?? game.homeTeam,
            point: dk.spread > 0 ? `+${dk.spread}` : `${dk.spread}`,
            pointValue: dk.spread,
            id: 1
          },
          away: {
            name: game.awayTeamData?.school ?? game.awayTeam,
            point: dk.spread < 0 ? `+${-1 * dk.spread}` : `${-1 * dk.spread}`,
            pointValue: -1 * dk.spread,
            id: 2
          }
        } : undefined,
      };
    });

    res.status(200).json(dataArr);
    return;
  } catch (err) {
    res.status(500).send(err);
  }
})


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