import React, { Dispatch, SetStateAction, useEffect, useMemo } from 'react';
import { useUIContext } from '../context/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface SelectWeekProps {
  onChange: Dispatch<SetStateAction<{ week?: string; year?: string; seasonType: 'regular' | 'postseason' }>>;
  vals: { week: string; year: string };
  heading: React.ReactNode;
}

const SelectWeek: React.FC<SelectWeekProps> = ({ onChange, heading, vals }: SelectWeekProps) => {
  const { seasonData, usePostSeason } = useUIContext();

  const handlePostSeasonEdge = (val: { label: string; value: string }, propName: string) => {
    if (val.label === 'Post Season') {
      onChange((prev) => ({ ...prev, [propName]: val.value, seasonType: 'postseason' }));
    } else {
      onChange((prev) => ({ ...prev, [propName]: val.value, seasonType: 'regular' }));
    }
  };

  const weeks = useMemo(() => {
    const maxWeeks = parseInt(vals.year) < new Date().getFullYear() ? 14 : seasonData?.ApiWeek;
    const weekArray = Array.from(Array(14).keys())
      .map((num) => ({ label: `Week ${num + 1}`, value: (num + 1)?.toString() }))
      .filter((num) => parseInt(num.value) <= (maxWeeks as number));
    weekArray.push({ label: 'Post Season', value: 'postseason-1' });
    return weekArray;
  }, [seasonData?.ApiWeek, vals.year]);

  const defaultWeek = useMemo(
    () => weeks.find((w) => (usePostSeason ? w.label === 'Post Season' : w.value === seasonData?.ApiWeek?.toString())),
    [usePostSeason, seasonData?.ApiWeek, weeks]
  );

  const toDate = useMemo(() => {
    const now = new Date();
    const year = seasonData?.Season || now.getFullYear();
    const yearsOptions = [];
    for (let initYear = 2024; initYear <= year; initYear++) {
      yearsOptions.push({ label: initYear.toString(), value: initYear.toString() });
    }
    return yearsOptions;
  }, [seasonData?.Season]);

  useEffect(() => {
    if (parseInt(vals.week) > weeks.length) {
      onChange((prev) => ({ ...prev, week: weeks[weeks.length - 2].value }));
    }
  }, [weeks, onChange, vals?.week]);

  const currentWeek = weeks.find((w) => vals.week === w.value);
  const currentYear = toDate.find((y) => y.value === vals.year);

  return (
    <div className="px-4 py-6 flex flex-wrap gap-3 items-center justify-between">
      {heading}
      <Select
        value={currentWeek?.value ?? defaultWeek?.value}
        onValueChange={(value) => {
          const option = weeks.find((w) => w.value === value);
          if (option) handlePostSeasonEdge(option, 'week');
        }}
      >
        <SelectTrigger className="flex-1 min-w-[140px]">
          <SelectValue placeholder="Select Week" />
        </SelectTrigger>
        <SelectContent>
          {weeks.map((w) => (
            <SelectItem key={w.value} value={w.value}>
              {w.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={currentYear?.value}
        onValueChange={(value) => onChange((prev) => ({ ...prev, year: value }))}
      >
        <SelectTrigger className="flex-1 min-w-[120px]">
          <SelectValue placeholder="Select Season" />
        </SelectTrigger>
        <SelectContent>
          {toDate.map((y) => (
            <SelectItem key={y.value} value={y.value}>
              {y.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SelectWeek;

SelectWeek.displayName = 'SelectWeek';
