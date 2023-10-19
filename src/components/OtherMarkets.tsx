import { Accordion, AccordionPanel, Box } from 'grommet';
import React, { useCallback } from 'react'
import { getOtherMarkets } from '../api/getOtherMarkets';
import { Matchup } from '../model';
 
interface OtherMarketsProps {
  gameId: string;
  addToSlate: (game: Matchup) => void;
  addedToSlate: boolean;
  disableSelections: boolean;
}
const OtherMarkets: React.FC<OtherMarketsProps> = ({
  gameId,  
  // addToSlate,
  // addedToSlate,
  // disableSelections
}: OtherMarketsProps) => {
  // const [isLoading, setIsLoading] = useState(false);
  // const [markets, setMarkets] = useState<Market[]>([]);

  const fetchMoreMarkets = useCallback(() => {
    // setIsLoading(true);
    const otherMarkets = getOtherMarkets(gameId, ['h2h', 'totals']);
    console.log(otherMarkets);
  }, [gameId]);

  const onPanelActive = (activeIndexes: number[]) => {
    if (activeIndexes.length) {
      fetchMoreMarkets()
    }
  }

  return (
    <Accordion onActive={onPanelActive} >
      <AccordionPanel label="More Market Options" >
        <Box pad={'medium'} >
          {/* {
            markets.map((market) => (
              <CheckBox label />
            ))
          } */}
        </Box>
      </AccordionPanel>
    </Accordion>
  )
}
 
export default OtherMarkets
 
OtherMarkets.displayName = "OtherMarkets"