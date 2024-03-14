import { Select } from 'grommet'
import React from 'react'
import { getWeek } from '../utils/getWeek'
 
interface SelectWeekProps {
  onChange: ({ week, year }: { week?: number; year?: number }) => void;
}
const SelectWeek: React.FC<SelectWeekProps> = ({
  onChange
}: SelectWeekProps) => {
  const weeks = Array.from(Array(14).keys()).map((num) => num + 1).filter((num) => num <= getWeek().week);
  return (
    <>
      <Select onChange={({ option }) => onChange(option.value)} placeholder='Select Week' options={weeks.map((num) => ({
        label: `Week ${num}`,
        value: num
      }))} />
    </>
  )
}
 
export default SelectWeek
 
SelectWeek.displayName = "SelectWeek"