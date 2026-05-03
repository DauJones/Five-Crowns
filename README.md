# Five Crowns Scorekeeper

A digital scorekeeper for the card game Five Crowns. Runs in any web browser. no app store, no account, no internet connection required after the page loads.

## How it works

**Setup** — Players enter 2–7 names to start a game. The first two names are required; the rest are optional. Duplicate names are automatically removed.

**Scoring** — After each round, someone enters everyone's point totals. The app shows a running scoreboard that highlights whoever is currently winning (lowest score). It also shows how many cards to deal and which card is wild that round, so it doubles as a game guide. There are 11 rounds total.

**Game Over** — When all 11 rounds are done, a winner banner appears. Ties are called out. Players can immediately start a new game.

## Features

- Scores are saved automatically in the browser. If someone closes the tab by accident, the game is still there when they come back
- Starting a new game mid-session shows a confirmation prompt so no one accidentally wipes the scores
- Card value reference (J=11, Q=12, K=13, Joker=0) is always visible during play

## How scores are stored

Scores are saved in **localStorage** — a small built-in storage area every browser provides. I just found out that this is possible so im using it.

Nothing is ever sent to a server or json or db.

## Limitations

- No way to edit a score after it's been submitted
- No history of past games
- Scores aren't shared across devices or players' phones

## Usage

Open `index.html` in any web browser. Or click the link in Pages. 
