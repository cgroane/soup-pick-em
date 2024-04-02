const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
var cfb = require('cfb.js');
require('dotenv').config({ path: path.resolve('.env') });
var defaultClient = cfb.ApiClient.instance;

var ApiKeyAuth = defaultClient.authentications['ApiKeyAuth'];
ApiKeyAuth.apiKey = `Bearer ${process.env.REACT_APP_CFBD_API_KEY}`;

const app = express();
app.use(cors());
app.use(bodyParser.json());
const api = new cfb.GamesApi()
app.get('/games', (req, res) => {
    opts = {
      'division': 'fbs',
      'week': req.query.week,
    }
    api.getGames(req.query.year, opts).then((resp) => res.send(resp));
})

app.listen(3001, () => {
  console.log('listening on port: ' + 3000);
})