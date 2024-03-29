import { Box, Select } from 'grommet'
import React from 'react'
import { useUIContext } from '../context/ui';
 
interface SelectWeekProps {
  onChange: (val: number, name: keyof { week: string; year: string }) => void;
}
const SelectWeek: React.FC<SelectWeekProps> = ({
  onChange
}: SelectWeekProps) => {
  const {
    seasonData
  } = useUIContext()
  const weeks = Array.from(Array(14).keys()).map((num) => num + 1).filter((num) => num <= (seasonData?.ApiWeek as number));
  return (
    <>
      <Box pad={'2rem 1rem'} flex direction='row' margin={'0 auto'} justify='between' >
        <Select
          onChange={({ option }) => onChange(option.value, 'week')}
          placeholder='Select Week'
          defaultValue={{label: `Week ${seasonData?.ApiWeek}`, value: seasonData?.ApiWeek}}
          options={weeks.map((num) => ({
            label: `Week ${num}`,
            value: num
          }))}
        />
        <Select onChange={({ option }) => onChange(option.value, 'year')}
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