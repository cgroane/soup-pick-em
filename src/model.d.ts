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
  selection: Outcome | 'PUSH'; /** Make Outcome handle type variability IE name = 'PUSH' number ='0' price = '0' */
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
  gameID:                number;
  season:                number;
  seasonType:            number;
  week:                  number;
  status:                string;
  day:                   Date;
  dateTime:              string;
  awayTeam:              string;
  homeTeam:              string;
  awayTeamID:            number;
  homeTeamID:            number;
  awayTeamName:          string;
  homeTeamName:          string;
  awayTeamScore:         number;
  homeTeamScore:         number;
  period:                string;
  timeRemainingMinutes:  number | null;
  timeRemainingSeconds:  number | null;
  pointSpread:           number;
  overUnder:             number;
  awayTeamMoneyLine:     number;
  homeTeamMoneyLine:     number;
  updated:               Date;
  created:               Date;
  globalGameID:          number;
  globalAwayTeamID:      number;
  globalHomeTeamID:      number;
  stadiumID:             number;
  yardLine:              number | null;
  yardLineTerritory:     string;
  down:                  number | null;
  distance:              number | null;
  possession:            string;
  isClosed:              boolean;
  gameEndDateTime:       Date;
  title:                 string | null;
  homeRotationNumber:    number;
  awayRotationNumber:    number;
  channel:               string;
  neutralVenue:          boolean;
  awayPointSpreadPayout: number;
  homePointSpreadPayout: number;
  overPayout:            number;
  underPayout:           number;
  dateTimeUTC:           string;
  attendance:            number;
  stadium:               Stadium;
  periods:               Period[];
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
