import { useState } from "react";

export const useSelectedWeek = (initalVals: { week?: number; year?: number }) => {
    const [selectedWeek, setSelectedWeek] = useState({
        ...initalVals
    });

    return {selectedWeek, setSelectedWeek};
}