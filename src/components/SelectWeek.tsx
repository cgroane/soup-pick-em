import { Box, Select } from 'grommet'
import React, { Dispatch, SetStateAction, useMemo } from 'react'
import { useUIContext } from '../context/ui';
 
interface SelectWeekProps {
  onChange: Dispatch<SetStateAction<{ week?: number; year?: number; seasonType: 'regular' | 'postseason' }>>;
  vals: { week: number; year: number }
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
    const maxWeeks = vals.year < new Date().getFullYear() ? 14 : seasonData?.ApiWeek;
    const weekArray = Array.from(Array(14).keys())
      .map((num) => ({label: `Week ${num + 1}`, value: num + 1 }))
      .filter((num) => num.value <= (maxWeeks as number));
    weekArray[weekArray.length - 1] = { label: 'Post Season', value: 1 };
    return weekArray;
  }, [seasonData?.ApiWeek, vals.year]);
  return (
    <>
      <Box pad={'2rem 1rem'} flex direction='row' margin={'0 auto'} justify='between' content='center' wrap >
        {heading}
        <Select
          margin={'1rem auto'}
          style={{ flexGrow: 1 }}
          onChange={({ option }) => handlePostSeasonEdge(option, 'week')}
          placeholder='Select Week'
          defaultValue={usePostSeason ? { value: 1, label: 'Post Season' } : { value: seasonData?.ApiWeek as number, label: `Week ${seasonData?.ApiWeek}`}}
          options={weeks}
          />
        <Select
          onChange={({ option }) => handlePostSeasonEdge(option, 'year')}
          style={{ flexGrow: 1 }}
          margin={'1rem auto'}
          placeholder='Select Season'
          defaultValue={{value: 2023, label: `${2023}`}}
          options={[2023, 2024].map((num) => ({
            label: `${num}`,
            value: num
          }))}
        />
      </Box>
    </>
  )
}
 
export default SelectWeek
 
SelectWeek.displayName = "SelectWeek"