import axios from "axios";
import { SeasonDetailsData } from "api/schema/sportsDataIO";

const CURRENT_SEASON_DETAILS_URL =
  "https://api.sportsdata.io/v3/cfb/scores/json/CurrentSeasonDetails";

const TTL_MS = 10 * 60 * 1000;

let cache: { at: number; value: SeasonDetailsData } | undefined;

const guessFromCalendar = (): SeasonDetailsData => {
  const now = new Date();
  const season = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
  return {
    Season: season,
    StartYear: season,
    EndYear: season + 1,
    Description: `${season}`,
    ApiSeason: `${season}`,
    ApiWeek: 1,
    isOffseason: false,
    seasonType: "regular",
  };
};

const normalize = (data: SeasonDetailsData): SeasonDetailsData => {
  // Canonical seasonType is the lowercase CFBD vocabulary ('regular' |
  // 'postseason' | 'offseason') declared on SeasonDetailsData. Preseason is
  // collapsed into 'offseason'. Downstream consumers (CFBD queries,
  // SelectWeek, fetchMatchups, Profile) all compare against these lowercase
  // words, so returning the uppercase SeasonTypes enum here silently breaks
  // every one of them (e.g. CFBD returns no games for seasonType=REGULAR).
  const seasonType: SeasonDetailsData["seasonType"] =
    data.ApiSeason?.includes("OFF") || data.ApiSeason?.includes("PRE")
      ? "offseason"
      : data.ApiSeason?.includes("POST")
        ? "postseason"
        : "regular";
  return { ...data, isOffseason: seasonType === "offseason", seasonType };
};

export const getCurrentSeasonDetails = async (): Promise<SeasonDetailsData> => {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  try {
    const res = await axios.get<SeasonDetailsData>(CURRENT_SEASON_DETAILS_URL, {
      headers: { "Ocp-Apim-Subscription-Key": process.env.REACT_APP_MATCHUPS_API_KEY ?? "" },
      timeout: 5000,
    });
    const value = normalize(res.data);
    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    if (cache) return cache.value;
    console.error("[current-week] upstream failed, falling back to calendar", err);
    return guessFromCalendar();
  }
};

export const resolveSeasonYear = async (year?: number): Promise<number> =>
  year ?? (await getCurrentSeasonDetails()).Season;
