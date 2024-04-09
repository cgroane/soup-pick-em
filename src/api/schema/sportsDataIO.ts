export type SeasonDetails = {
  Season: number;
  StartYear: number;
  EndYear: number;
  Description: string;
  ApiSeason: string;
  ApiWeek: number;
}
export type SeasonDetailsData = SeasonDetails & {
  seasonType: 'regular' | 'postseason';
}