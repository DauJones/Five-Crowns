const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const GAME_FILE = path.join(__dirname, 'game.json');

const ROUNDS = [
  { round: 1,  cards: 3,  wild: '3s'     },
  { round: 2,  cards: 4,  wild: '4s'     },
  { round: 3,  cards: 5,  wild: '5s'     },
  { round: 4,  cards: 6,  wild: '6s'     },
  { round: 5,  cards: 7,  wild: '7s'     },
  { round: 6,  cards: 8,  wild: '8s'     },
  { round: 7,  cards: 9,  wild: '9s'     },
  { round: 8,  cards: 10, wild: '10s'    },
  { round: 9,  cards: 11, wild: 'Jacks'  },
  { round: 10, cards: 12, wild: 'Queens' },
  { round: 11, cards: 13, wild: 'Kings'  },
];

function readGame() {
  try {
    if (!fs.existsSync(GAME_FILE)) return null;
    return JSON.parse(fs.readFileSync(GAME_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeGame(data) {
  fs.writeFileSync(GAME_FILE, JSON.stringify(data, null, 2));
}

function computeTotals(scores, players) {
  const totals = {};
  for (const p of players) {
    totals[p] = (scores[p] || []).reduce((sum, v) => sum + v, 0);
  }
  return totals;
}

function htmlShell(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
${body}
</body>
</html>`;
}

function buildScoreTable(game) {
  const { players, scores, currentRound } = game;
  const completedRounds = currentRound - 1;
  const totals = computeTotals(scores, players);

  const minTotal = Math.min(...players.map(p => totals[p]));

  const headerCols = players.map(p => `<th>${p}</th>`).join('');
  const header = `<tr><th>Round</th><th>Cards</th><th>Wild</th>${headerCols}</tr>`;

  let rows = '';
  for (let i = 0; i < completedRounds; i++) {
    const r = ROUNDS[i];
    const cols = players.map(p => `<td>${scores[p][i]}</td>`).join('');
    rows += `<tr><td>${r.round}</td><td>${r.cards}</td><td>${r.wild}</td>${cols}</tr>`;
  }

  const totalCols = players.map(p => {
    const cls = totals[p] === minTotal && completedRounds > 0 ? ' class="leading"' : '';
    return `<td${cls}>${totals[p]}</td>`;
  }).join('');
  const totalsRow = `<tr class="totals-row"><td colspan="3">Total</td>${totalCols}</tr>`;

  return `<table>${header}${rows}${totalsRow}</table>`;
}

function renderSetup(error) {
  const errorHtml = error ? `<p class="error">${error}</p>` : '';
  const inputs = Array.from({ length: 7 }, (_, i) => {
    const n = i + 1;
    const req = n <= 2 ? ' required' : '';
    return `<input type="text" name="p${n}" placeholder="Player ${n}"${req} maxlength="20">`;
  }).join('\n        ');

  return htmlShell('Five Crowns', `
  <h1>Five Crowns</h1>
  <div class="setup-form">
    <h2>New Game</h2>
    ${errorHtml}
    <form action="/game/start" method="POST">
      <div class="name-inputs">
        ${inputs}
      </div>
      <button class="btn btn-primary" type="submit">Start Game</button>
    </form>
  </div>
  <p class="ref">Card values: 3–10 = face value &nbsp;|&nbsp; J = 11 &nbsp;|&nbsp; Q = 12 &nbsp;|&nbsp; K = 13 &nbsp;|&nbsp; Joker = 0</p>
`);
}

function renderScoring(game, error) {
  const { currentRound, players } = game;
  const roundMeta = ROUNDS[currentRound - 1];
  const errorHtml = error ? `<p class="error">${error}</p>` : '';

  const scoreInputs = players.map(p => `
      <div class="score-input-group">
        <label for="score_${p}">${p}</label>
        <input id="score_${p}" type="number" name="${p}" min="0" required>
      </div>`).join('');

  return htmlShell(`Five Crowns — Round ${currentRound}`, `
  <h1>Five Crowns</h1>
  <p class="round-info">Round ${currentRound} of 11 &nbsp;·&nbsp; ${roundMeta.cards} cards &nbsp;·&nbsp; ${roundMeta.wild} are wild</p>
  ${buildScoreTable(game)}
  <div class="score-form">
    <h2>Enter Round ${currentRound} Scores</h2>
    ${errorHtml}
    <form action="/game/round" method="POST">
      <div class="score-inputs">${scoreInputs}
      </div>
      <div class="actions">
        <button class="btn btn-primary" type="submit">Submit Round ${currentRound}</button>
      </div>
    </form>
  </div>
  <form action="/game/reset" method="POST" style="margin-top:1rem">
    <button class="btn btn-secondary" type="submit" onclick="return confirm('Start a new game? Current scores will be lost.')">New Game</button>
  </form>
`);
}

function renderResults(game) {
  const { players } = game;
  const totals = computeTotals(game.scores, players);
  const minTotal = Math.min(...players.map(p => totals[p]));
  const winners = players.filter(p => totals[p] === minTotal);

  let winnerText;
  if (winners.length === 1) {
    winnerText = `🏆 Winner: ${winners[0]} with ${minTotal} points!`;
  } else {
    winnerText = `🏆 Tie: ${winners.join(' & ')} with ${minTotal} points each!`;
  }

  return htmlShell('Five Crowns — Game Over', `
  <h1>Five Crowns — Game Over</h1>
  <div class="winner-banner">${winnerText}</div>
  ${buildScoreTable(game)}
  <form action="/game/reset" method="POST" style="margin-top:1.5rem">
    <button class="btn btn-primary" type="submit">Play Again</button>
  </form>
`);
}

app.get('/', (req, res) => {
  const game = readGame();
  const error = req.query.error || null;

  if (!game || game.status === 'setup') {
    return res.send(renderSetup(error));
  }
  if (game.status === 'finished') {
    return res.send(renderResults(game));
  }
  res.send(renderScoring(game, error));
});

app.post('/game/start', (req, res) => {
  const names = ['p1','p2','p3','p4','p5','p6','p7']
    .map(k => (req.body[k] || '').trim())
    .filter(n => n.length > 0);

  const players = [...new Set(names)];

  if (players.length < 2 || players.length > 7) {
    return res.redirect('/?error=Enter+between+2+and+7+player+names.');
  }

  const scores = {};
  for (const p of players) scores[p] = [];

  writeGame({ status: 'playing', players, currentRound: 1, scores });
  res.redirect('/');
});

app.post('/game/round', (req, res) => {
  const game = readGame();
  if (!game || game.status !== 'playing') return res.redirect('/');

  const { players } = game;
  const parsed = {};

  for (const p of players) {
    const val = parseInt(req.body[p], 10);
    if (isNaN(val) || val < 0) {
      return res.redirect('/?error=All+scores+must+be+0+or+higher.');
    }
    parsed[p] = val;
  }

  for (const p of players) {
    game.scores[p].push(parsed[p]);
  }

  game.currentRound += 1;
  if (game.currentRound > 11) game.status = 'finished';

  writeGame(game);
  res.redirect('/');
});

app.post('/game/reset', (_req, res) => {
  writeGame({ status: 'setup', players: [], currentRound: 1, scores: {} });
  res.redirect('/');
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));
