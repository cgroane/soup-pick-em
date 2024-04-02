import { User } from "firebase/auth";
import { PickHistory } from "./pages/Picks/PicksTable";

export type UserCollectionData = User & {
  id: string;
  email: string;
  fName: string;
  lName: string;
  isAuthenticated?: boolean;
  roles: UserRoles[];
  pickHistory: PickHistory[];
  record?: WinLossRecord;
  trophyCase?: Trophy[];
}

export type Picks = {
  selection: Outcome; /** Make Outcome handle type variability IE name = 'PUSH' number ='0' price = '0' */
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
  games: Matchup[];
  providedBy: UserCollectionData;
  uniqueWeek: string;
}

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
  awayTeamAPRanking?:    number;
  homeTeamAPRanking?:    number;
  awayTeamCFPRanking?:   number;
  homeTeamCFPRanking?:   number;
  awayTeamData:          Team;
  homeTeamData:          Team;
  theOddsId:             string;
  outcomes:    Outcome[];
}

export interface Period {
  periodID:  number;
  gameID:    number;
  number:    number;
  name:      string;
  awayScore: number;
  homeScore: number;
}

export interface Stadium {
  stadiumID: number;
  active:    boolean;
  name:      string;
  dome:      boolean;
  city:      string;
  state:     string;
  geoLat:    number;
  geoLong:   number;
}

export type Team = {
  teamID:           number;
  key:              string;
  active:           boolean;
  school:           string;
  name:             string;
  stadiumID:        number;
  apRank:           null;
  wins:             number;
  losses:           number;
  conferenceWins:   number;
  conferenceLosses: number;
  globalTeamID:     number;
  coachesRank:      null;
  playoffRank:      null;
  teamLogoUrl:      string;
  conferenceID:     number;
  conference:       string;
  shortDisplayName: string;
  rankWeek:         null;
  rankSeason:       null;
  rankSeasonType:   null;
}

export interface TheOddsResult {
  id:            string;
  sport_key:     string;
  sport_title:   string;
  commence_time: Date;
  home_team:     string;
  away_team:     string;
  bookmakers:    Bookmaker[];
}

export interface TheOddsMatchup {
  data: TheOddsResult[]
}

export interface Bookmaker {
  key:         string;
  title:       string;
  last_update: Date;
  markets:     Market[];
}

export interface Market {
  key:         MarketKey;
  last_update: Date;
  outcomes:    Outcome[];
}

export enum MarketKey {
  Spreads = "spreads",
}

export interface Outcome {
  name:  string;
  price: number;
  point: number;
}
