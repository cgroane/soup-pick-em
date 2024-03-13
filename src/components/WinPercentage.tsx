import { Box, Meter, Stack, Text } from "grommet";
import React, { useMemo } from "react"
import { useGlobalContext } from "../context/user";

interface WinPercentageProps {}
const WinPercentage = ({
  ...props
}: WinPercentageProps ) => {
    const { user } = useGlobalContext();
    const val = useMemo(() => {
        if (user?.record && (user?.record?.wins !== 0 && user?.record?.losses !== 0)) {
            return (user?.record?.wins as number / (user?.record?.wins as number + user?.record?.losses as number) ) as number
        }
        return 0;
    }, [user?.record]);
    
  return (
    <>
    <Box direction="row" pad={"small"} >
        <Box align="center" pad="large">
            <Stack anchor="center" >
                <Meter
                    type="circle"
                    background={'light-2'}
                    max={1}
                    size="small"
                    values={[
                        {
                            value: val,
                            label: (val*100).toString() + '%'
                        }
                    ]}
                />
                <Box direction="row" align="center" pad={{ bottom: 'xsmall' }} >
                    <Text size="xlarge" weight={'bold'} >
                        {val*100}%
                    </Text>
                </Box>
            </Stack>
        </Box>
        <Box height={'auto'} margin={{ left: '2rem' }} direction="column" justify="center" flex="grow"> 
            <Text>
                {user?.record?.wins} - {user?.record?.losses}
            </Text>
        </Box>
      </Box>
    </>
  )
};

export default WinPercentage;
