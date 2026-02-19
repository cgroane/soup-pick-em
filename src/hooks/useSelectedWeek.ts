import { useState } from "react";

export const useSelectedWeek = (initalVals: { week?: string; year?: string; seasonType: 'regular' | 'postseason' }) => {
    const [selectedWeek, setSelectedWeek] = useState({
        ...initalVals
    });

    return {selectedWeek, setSelectedWeek};
}