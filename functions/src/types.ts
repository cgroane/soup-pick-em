import { GetGamesResponse, Team as CFBDTeam } from "cfbd";
import { UserInfo } from "firebase-admin/auth";

export type SeasonDetails = {
  Season: number;
  StartYear: number;
  EndYear: number;
  Description: string;
  ApiSeason: string;
  ApiWeek: number;
  isOffSeason: boolean;
}
export type Matchup = {
  id: number
  gameID?: number
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
  highlights: string[]
  notes: string[];
  pointSpread: number;
  awayTeamAPRanking?: number;
  homeTeamAPRanking?: number;
  awayTeamCFPRanking?: number;
  homeTeamCFPRanking?: number;
  awayTeamData: Team;
  homeTeamData: Team;
  theOddsId: string;
  outcomes: Outcome[] | NewOutcomes;
}

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

export type Picks = {
  selection: NewOutcomeEntry;
  isCorrect: boolean;
  matchup: number;
  userId: string;
  week: number;
}
export interface Outcome {
  name: string;
  price: number;
  point: number;
}

export interface PickHistory {
  slateId: string;
  name: string;
  userId: string;
  week: number;
  year: number;
  picks: Picks[];
  processed?: boolean;
  processedAt?: string;
  correctCount?: number;
  incorrectCount?: number;
}

export type Slate = {
  week: number;
  games: GamesAPIResult[];
  providedBy: UserCollectionData;
  uniqueWeek: string;
  processed?: boolean;
}
export type UserCollectionData = UserInfo & {
  id: string;
  email: string;
  fName: string;
  lName: string;
  isAuthenticated?: boolean;
  roles: UserRoles[];
  pickHistory: PickHistory[];
  record: WinLossRecord[];
  // trophyCase?: Trophy[];
}
export type WinLossRecord = {
  year: number;
  wins: number;
  losses: number;
}
export enum UserRoles {
  ADMIN = "admin",
  SLATE_PICKER = "slate-picker",
  BASIC = "basic"
}

export interface NewOutcomeEntry {
  name: string;
  point: string;
  pointValue: number;
  id: number;
}

export interface NewOutcomes {
  home: NewOutcomeEntry;
  away: NewOutcomeEntry;
}

export interface OldGame {
  gameID?: number;
  id?: number;
  homeTeam: string;
  awayTeam: string;
  homeId?: number;
  awayId?: number;
  outcomes?: Outcome[] | NewOutcomes;
  startTimeTbd?: boolean;
  startTimeTBD?: boolean;
  homePostWinProb?: number;
  homePostgameWinProbability?: number;
  awayPostWinProb?: number;
  awayPostgameWinProbability?: number;
  completed?: boolean;
  homeLineScores?: number[];
  homeTeamData?: {
    teamLogoUrl?: string;
    logos?: string[];
    id?: number;
    teamID?: number;
    [key: string]: unknown;
  };
  awayTeamData?: {
    teamLogoUrl?: string;
    logos?: string[];
    id?: number;
    teamID?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface OldSelection {
  name: string;
  price?: number;
  point: number;
  pointValue?: number;
  id?: number;
}

export interface OldPick {
  selection?: OldSelection;
  [key: string]: unknown;
}

export interface OldPickDocument {
  slateId?: string;
  picks?: OldPick[];
  [key: string]: unknown;
}

export interface MigrationResult {
  slatesMigrated: number;
  picksMigrated: number;
  dryRun: boolean;
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
}

export type GamesAPIResponseOutcome = {
  name: string;
  point: string; // formatted spread string e.g. "+3.5" or "-3.5"
  pointValue: number | undefined;
  id: number;
  isCorrect?: boolean;
}

export type CFPRound = "firstRound" | "quarterfinal" | "semifinal" | "championship";

export type CFPBracket = {
  year: number;
  games: GamesAPIResult[];
  updatedAt: string;
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

