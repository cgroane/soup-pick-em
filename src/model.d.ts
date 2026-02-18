import { User } from "firebase/auth";
import { PickHistory } from "./pages/Picks/PicksTable";
import { GetGamesResponse, Team as CFBDTeam } from "cfbd";

export type UserCollectionData = User & {
  id: string;
  email: string;
  fName: string;
  lName: string;
  isAuthenticated?: boolean;
  roles: UserRoles[];
  pickHistory: PickHistory[];
  record: WinLossRecord[];
  trophyCase?: Trophy[];
}

export type Picks = {
  selection: GamesAPIResponseOutcome; /** Make Outcome handle type variability IE name = 'PUSH' number ='0' price = '0' */
  isCorrect: boolean;
  matchup: number;
  userId: string;
  week: number;
}

export type Score = {
  game: Matchup;
  opponent: Team & { opponentScore };
}

export type WinLossRecord = {
  wins: number;
  losses: number;
  year: number;
}

export type Trophy = {
  matchupName: string;
  trophyName: string;
  trophy: {
    image: string;
    alt: string;
  }
}

export type Slate = {
  week: number;
  games: GamesAPIResult[];
  providedBy: UserCollectionData;
  uniqueWeek: string;
}

/** @deprecated Use GamesAPIResult instead */
export type Matchup = {
  id: number
  gameID: number
  season: number
  week: number
  seasonType: string
  startDate: string
  startTimeTbd: boolean
  neutralSite: boolean
  conferenceGame: boolean
  attendance: number
  venueId: number
  venue: string
  homeId: number
  homeTeam: string
  homeConference: string
  homePoints: number
  homeLineScores: number[]
  homePostWinProb: number
  homePregameElo: number
  homePostgameElo: number
  awayId: number
  awayTeam: string
  awayConference: string
  awayPoints: number
  awayLineScores: number[]
  awayPostWinProb: number
  awayPregameElo: number
  awayPostgameElo: number
  excitementIndex: number
  highlights: any
  notes: any;
  pointSpread: number;
  awayTeamAPRanking?: number;
  homeTeamAPRanking?: number;
  awayTeamCFPRanking?: number;
  homeTeamCFPRanking?: number;
  awayTeamData: Team;
  homeTeamData: Team;
  theOddsId: string;
  outcomes: Outcome[];
}

/** @deprecated */
export interface Period {
  periodID: number;
  gameID: number;
  number: number;
  name: string;
  awayScore: number;
  homeScore: number;
}

/** @deprecated */
export interface Stadium {
  stadiumID: number;
  active: boolean;
  name: string;
  dome: boolean;
  city: string;
  state: string;
  geoLat: number;
  geoLong: number;
}

/** @deprecated Use CFBDTeam instead */
export type Team = {
  teamID: number;
  key: string;
  active: boolean;
  school: string;
  name: string;
  stadiumID: number;
  apRank: null;
  wins: number;
  losses: number;
  conferenceWins: number;
  conferenceLosses: number;
  globalTeamID: number;
  coachesRank: null;
  playoffRank: null;
  teamLogoUrl: string;
  conferenceID: number;
  conference: string;
  shortDisplayName: string;
  rankWeek: null;
  rankSeason: null;
  rankSeasonType: null;
}

/** @deprecated */
export interface TheOddsResult {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: Date;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

/** @deprecated */
export interface TheOddsMatchup {
  data: TheOddsResult[]
}

/** @deprecated */
export interface Bookmaker {
  key: string;
  title: string;
  last_update: Date;
  markets: Market[];
}

/** @deprecated */
export interface Market {
  key: MarketKey;
  last_update: Date;
  outcomes: Outcome[];
}

/** @deprecated */
export enum MarketKey {
  Spreads = "spreads",
}

/** @deprecated Use GamesAPIResponseOutcome instead */
export interface Outcome {
  name: string;
  price: number;
  point: number;
}

export type LeaderBoardData = {
  winsAndLosses: number;
  wins: number;
  losses: number;
  pctg: number;
  fName: string;
  lName: string;
  uid: string;
}

export interface Poll {
  poll: string
  ranks: Rank[]
}

export interface Rank {
  rank: number
  school: string
  conference: string
  firstPlaceVotes: number
  points: number
};

export type GamesAPIResponseOutcome = {
  name: string;
  point: string; // formatted spread string e.g. "+3.5" or "-3.5"
  pointValue: number | undefined;
  id: number;
  isCorrect?: boolean;
}


/** Response type for GET /api/matchups */
export type MatchupsAPIResponse = GamesAPIResult[];

export type GamesAPIResult = GetGamesResponse[0] & {
  awayTeamAPRanking?: number;
  homeTeamAPRanking?: number;
  awayTeamCFPRanking?: number;
  homeTeamCFPRanking?: number;
  pointSpread?: number;
  homeTeamData: CFBDTeam & { apRank?: number; playoffRank?: number; coachesRank?: number; };
  awayTeamData: CFBDTeam & { apRank?: number; playoffRank?: number; coachesRank?: number; };
  outcomes: ({
    away: GamesAPIResponseOutcome,
    home: GamesAPIResponseOutcome
  } | undefined);
};
