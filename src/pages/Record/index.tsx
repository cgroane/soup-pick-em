import React from "react"
import { useUIContext } from "../../context/ui";
import { useGlobalContext } from "../../context/user";
import { Box, Heading, Select } from "grommet";

interface RecordProps {}
const Record = ({
  ...props
}: RecordProps ) => {
    const { seasonData } = useUIContext();
    const { user, userOverallRecord } = useGlobalContext();
  return (
    <>
    <Box>
        <Box>    
            <Heading>
                Overall:
                { userOverallRecord.wins } - { userOverallRecord.losses }
            </Heading>
        </Box>
        <Box>
            <Heading>
                By Season
            </Heading>
            <Select
                options={user?.pickHistory?.map((h) => ({ value: h.year, label: h.year })) ?? []}
                defaultValue={seasonData?.Season}
            />
        </Box>
    </Box>
    </>
  )
};

export default Record;
