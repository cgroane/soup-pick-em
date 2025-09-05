import { Box, Select } from 'grommet'
import React, { Dispatch, SetStateAction, useEffect, useMemo } from 'react'
import { useUIContext } from '../context/ui';
 
interface SelectWeekProps {
  onChange: Dispatch<SetStateAction<{ week?: string; year?: string; seasonType: 'regular' | 'postseason' }>>;
  vals: { week: string; year: string }
  heading: React.ReactNode;
}
const SelectWeek: React.FC<SelectWeekProps> = ({
  onChange, heading, vals
}: SelectWeekProps) => {
  const {
    seasonData,
    usePostSeason,
  } = useUIContext()
  /**
   * this needs to know if year is previous
   * if yes, you can show all weeks from the season
   * if not, then it's current and you can show up to THIS week
   * 
   * if current
   * if season includes POST --> default should be last index which is bowls
   * 
   * selecting week 1 will be tricky. 
   * if POST week 1 will fetch POST SEASON WEEK 1 every time, but should pick the week that they actually select
   * this is because in POST, i am forcing seasontype postseason
   * to handle week 1, need to make seasontype regular
   * 
   */
  const handlePostSeasonEdge = (val: { label: string; value: number }, propName: string) => {
    if (val.label === 'Post Season') {
      onChange((prev) => {

        return {
          ...prev,
          [propName]: val.value,
          seasonType: 'postseason'
        }
      })
    } else {
      onChange((prev) => ({
        ...prev,
        [propName]: val.value,
        seasonType: 'regular'
      }))
    }
  }
  const weeks = useMemo(() => {
    const maxWeeks = parseInt(vals.year) < new Date().getFullYear() ? 14 : seasonData?.ApiWeek;
    const weekArray = Array.from(Array(14).keys())
      .map((num) => ({label: `Week ${num + 1}`, value: (num + 1).toString() }))
      .filter((num) => parseInt(num.value) <= (maxWeeks as number));
    weekArray.push({ label: 'Post Season', value: 'postseason-1' });
    return weekArray;
  }, [seasonData?.ApiWeek, vals.year]);

  const defaultWeek = useMemo(() => weeks.find((w) => usePostSeason ? w.label === 'Post Season' : w.value === seasonData?.ApiWeek.toString()), [usePostSeason, seasonData?.ApiWeek, weeks]);
  const defaultYear = useMemo(() => ({
    label: seasonData?.Season.toString(),
    value: seasonData?.Season
  }), [seasonData?.Season]);

  /**
   * when i change a year, should reset the week
   */

  useEffect(() => {
    if (parseInt(vals.week) > weeks.length) {
      onChange((prev) => ({ ...prev, week: weeks[weeks.length - 2].value }))
    }
  }, [weeks, onChange, vals?.week]);

  const toDate = useMemo(() => {
    const now = new Date();
    const year = seasonData?.Season || now.getFullYear();
    
    let yearsOptions = [];
    for (let initYear = 2024; initYear <= year; initYear++) {
      yearsOptions.push({ label: initYear.toString(), value: initYear.toString() })
    };
    return yearsOptions;
  }, [seasonData?.Season]);

  
  return (
    <>
      <Box pad={'2rem 1rem'} flex direction='row' margin={'0 auto'} justify='between' content='center' wrap >
        {heading}
        <Select
          margin={'1rem auto'}
          style={{ flexGrow: 1 }}
          onChange={({ option }) => handlePostSeasonEdge(option, 'week')}
          placeholder='Select Week'
          defaultValue={defaultWeek}
          value={weeks.find((w) => vals.week === w.value)}
          options={weeks}
          />
        <Select
          onChange={({ option }) => onChange((prev) => ({ ...prev, year: option.value }))}
          style={{ flexGrow: 1 }}
          margin={'1rem auto'}
          placeholder='Select Season'
          defaultValue={defaultYear}
          value={toDate.find((y) => y.value === vals.year)}
          options={toDate}
        />
      </Box>
    </>
  )
}
 
export default SelectWeek
 
SelectWeek.displayName = "SelectWeek"