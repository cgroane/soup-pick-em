const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
var cfb = require('cfb.js');
require('dotenv').config({ path: path.resolve('.env') });

const port = process.env.PORT || 3001;
var defaultClient = cfb.ApiClient.instance;

var ApiKeyAuth = defaultClient.authentications['ApiKeyAuth'];
ApiKeyAuth.apiKey = `Bearer ${process.env.REACT_APP_CFBD_API_KEY}`;

const app = express();
app.use(cors());
app.use(bodyParser.json());
const api = new cfb.GamesApi();
const rankingsApi = new cfb.RankingsApi();
app.get('/api/games', (req, res) => {
    opts = {
      'division': 'fbs',
      'week': req.query.week,
      'seasonType': req.query.seasonType
    }
    api.getGames(req.query.year, opts).then((resp) => res.send(resp));
});
app.get('/api/rankings', (req, res) => {
  opts = {
    'week': req.query.week,
    'seasonType': req.query.seasonType
  };
  rankingsApi.getRankings(req.query.year, opts).then((respn) => {
    if (respn[0].polls.map((p) => p.poll).includes("Playoff Committee Rankings")) {
      res.send(respn[0].polls.find((p) => p.poll === "Playoff Committee Rankings"));
    } else {
      res.send(respn[0].polls.find((p) => p.poll === 'AP Top 25'));
    };
  });
});

const root = path.join(__dirname, '../build');
app.use(express.static(root));
app.use(function(req, res, next) {
  if (req.method === 'GET' && req.accepts('html') && !req.is('json') && !req.path.includes('.')) {
    res.sendFile('index.html', { root })
  } else next()
}).use(cors());

app.listen(port, () => {
  console.log(`Listening on port: ${port}`);
});