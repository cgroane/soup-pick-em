import dotenv from 'dotenv';
import express  from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path, { dirname } from 'path';
import { client, SeasonType, getGames, getRankings } from 'cfbd';
import { fileURLToPath } from 'url';

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
      'week': parseInt(req.query.week),
      'seasonType': req.query.seasonType
    }
    const games = await getGames({
      query: {
        year: parseInt(req.query.year),
        ...opts
      }
    });
    res.send(games.data);
    return;
  } catch (err) {
    res.send(err).status(500)
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
        res.send(rankings?.data?.[0].polls.find((p) => p.poll === "Playoff Committee Rankings"));
      } else {
        res.send(rankings?.data?.[0]?.polls.find((p) => p.poll === 'AP Top 25'));
      };
      return;
  } catch (err) {
    console.error(err)
    res.send(err).status(500)
  }
});

const root = path.join(__dirname, '../build');
app.use(express.static(root));
app.use(function(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET' && req.accepts('html') && !req.is('json') && !req.path.includes('.')) {
    res.sendFile('index.html', { root })
  } else next()
}).use(cors());

app.listen(port, () => {
  console.log(`Listening on port: ${port}`);
});