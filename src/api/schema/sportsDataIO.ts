export type SeasonDetails = {
  Season: number;
  StartYear: number;
  EndYear: number;
  Description: string;
  ApiSeason: string;
  ApiWeek: number;
  isOffseason: boolean;
}
export type SeasonDetailsData = SeasonDetails & {
  seasonType: 'regular' | 'postseason' | 'offseason';
}