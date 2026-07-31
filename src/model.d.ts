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
  processed?: boolean;
}

// ============================================================================
// Groups feature (branch: feature/groups)
//
// Independent pick'em pools. Storage is group-centric:
//   groups/{gid}
//     members/{uid}                        <- membership = the join + per-group state
//       picks/{uniqueWeek}                 <- PickHistory (authoritative; NOT mirrored on member doc)
//     slates/{uniqueWeek}                  <- Slate, scoped to the group
//   users/{uid}/memberships/{gid}          <- mirror for "list my groups"
// ============================================================================

export type GroupVisibility = 'private' | 'public';
export type GroupRole = 'owner' | 'slate-picker' | 'member';

export type Group = {
  id: string;
  name: string;
  visibility: GroupVisibility;
  /** Shareable code used to join a private group. */
  inviteCode: string;
  /** uid of the group owner (maps to the global admin for the legacy group). */
  ownerUid: string;
  /** ISO timestamp. */
  createdAt: string;
  description?: string;
};

/** groups/{gid}/members/{uid} — per-group state that used to live on the user doc. */
export type GroupMember = {
  uid: string;
  /** Every member has MEMBER; at most one carries OWNER and one SLATE_PICKER
   * (the same person may hold both). See constants.GroupRole. */
  roles: GroupRole[];
  record: WinLossRecord[];
  trophyCase?: Trophy[];
  /** Denormalized for cheap leaderboard rendering without a users read. */
  fName: string;
  lName: string;
  email: string;
  /** ISO timestamp. */
  joinedAt: string;
};

/** users/{uid}/memberships/{gid} — lightweight mirror so a user can list their groups. */
export type GroupMembership = {
  gid: string;
  name: string;
  roles: GroupRole[];
  /** ISO timestamp. */
  joinedAt: string;
};

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

export type CFPRound = 'firstRound' | 'quarterfinal' | 'semifinal' | 'championship';

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
