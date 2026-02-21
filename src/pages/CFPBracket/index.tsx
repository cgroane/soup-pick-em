import React, { useCallback } from 'react';
import { Box, Button, Heading, Spinner, Text } from 'grommet';
import { useCFPContext } from '../../context/cfp';
import { useGlobalContext } from '../../context/user';
import { useUIContext } from '../../context/ui';
import BracketDisplay from '../../components/BracketDisplay';
import { Picks } from '../../model';

const CFPBracket: React.FC = () => {
  const { bracket, cfpPicks, addCfpPick, saveCfpPicks, isSaving } = useCFPContext();
  const { user } = useGlobalContext();
  const { seasonData } = useUIContext();

  const handlePick = useCallback((pick: Picks) => {
    addCfpPick(pick);
  }, [addCfpPick]);

  if (!bracket?.games?.length) {
    return (
      <Box pad="xlarge" align="center">
        <Text color="dark-4">
          The CFP bracket has not been published yet. Check back soon.
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box pad={{ horizontal: 'medium', top: 'medium' }} direction="row" justify="between" align="center">
        <Heading level={3} color="light-1" margin="0">
          CFP Bracket — {seasonData?.Season}
        </Heading>
        <Box direction="row" gap="small" align="center">
          <Text size="small" color="dark-4">
            {cfpPicks.picks.length} pick{cfpPicks.picks.length !== 1 ? 's' : ''} made
          </Text>
          <Button
            primary
            size="small"
            label={isSaving ? 'Saving...' : 'Save Picks'}
            disabled={isSaving || cfpPicks.picks.length === 0}
            icon={isSaving ? <Spinner size="xsmall" /> : undefined}
            onClick={saveCfpPicks}
          />
        </Box>
      </Box>

      <BracketDisplay
        games={bracket.games}
        userPicks={cfpPicks.picks}
        onPick={handlePick}
        userId={user?.uid ?? ''}
      />

      <Box pad="medium" align="center">
        <Button
          primary
          label={isSaving ? 'Saving...' : 'Save Picks'}
          disabled={isSaving || cfpPicks.picks.length === 0}
          icon={isSaving ? <Spinner size="xsmall" /> : undefined}
          onClick={saveCfpPicks}
        />
      </Box>
    </Box>
  );
};

export default CFPBracket;

CFPBracket.displayName = 'CFPBracket';
