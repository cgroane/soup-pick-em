import { useEffect, useState } from "react";

export const useSelectedWeek = (initalVals: { week?: string; year?: string; seasonType: 'regular' | 'postseason' }) => {
    const [selectedWeek, setSelectedWeek] = useState({
        ...initalVals
    });

    // `initalVals` derives from seasonData, which loads asynchronously and is
    // empty on first render. Backfill once the real values arrive, but never
    // clobber a selection the user has already made.
    const { week, year, seasonType } = initalVals;
    useEffect(() => {
        setSelectedWeek((prev) => (prev.week ? prev : { week, year, seasonType }));
    }, [week, year, seasonType]);

    return {selectedWeek, setSelectedWeek};
}