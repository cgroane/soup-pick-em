import { Box, Heading, Meter, Stack, Text } from "grommet";
import React, { useMemo } from "react"

interface WinPercentageProps {
    wins: number;
    losses: number;
    label: string;
}
const WinPercentage = ({
    wins = 0, losses = 0, label
}: WinPercentageProps ) => {
    const val = useMemo(() => {
        
        return (!!wins && !!losses) ? ((wins) / (wins + losses)) : 0;
    }, [wins, losses]);
    
  return (
    <>
        <Box flex direction="column" wrap pad={{ bottom: '1rem' }} align="center" >
            <Heading textAlign="center" style={{ width: '100%'}} size="small" weight={'regular'} >{label}</Heading>
            <Box flex direction="row" align="center" pad="large">
                <Stack anchor="center" >
                    <Meter
                        type="circle"
                        background={'light-2'}
                        max={1}
                        size="small"
                        values={[
                            {
                                value: val,
                                label: (val*100) + '%'
                            }
                        ]}
                    />
                    <Box direction="row" align="center" pad={{ bottom: 'xsmall' }} >
                        <Text size="xlarge" weight={'bold'} >
                            {(val*100).toFixed(2)}%
                        </Text>
                    </Box>
                    <Box height={'auto'} margin={{ top: '2.5rem' }} direction="column" justify="center" flex="grow"> 
                        <Text textAlign="center" >
                            {wins} - {losses}
                        </Text>
                    </Box>
                </Stack>
            
            </Box>
        </Box>
    </>
  )
};

export default WinPercentage;
