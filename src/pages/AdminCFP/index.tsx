import React, { useMemo } from 'react';
import { Box, Button, Heading, Spinner, Text } from 'grommet';
import { useCFPContext, cfpRound } from '../../context/cfp';
import { useUIContext } from '../../context/ui';
import { CFPRound, GamesAPIResult } from '../../model';

const ROUND_LABELS: Record<CFPRound, string> = {
  firstRound: 'First Round',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  championship: 'Championship',
};

const ROUND_ORDER: CFPRound[] = ['firstRound', 'quarterfinal', 'semifinal', 'championship'];

const AdminCFP: React.FC = () => {
  const { bracket, refreshAndSaveBracket, isRefreshing } = useCFPContext();
  const { seasonData } = useUIContext();
  const year = seasonData?.Season ?? new Date().getFullYear();

  const gamesByRound = useMemo(() => {
    if (!bracket?.games) return {} as Partial<Record<CFPRound, GamesAPIResult[]>>;
    const map: Partial<Record<CFPRound, GamesAPIResult[]>> = {};
    bracket?.games?.forEach((g) => {
      const round = cfpRound(g);
      if (!map[round]) map[round] = [];
      map[round]!.push(g);
    });
    return map;
  }, [bracket?.games]);

  return (
    <Box pad="medium">
      <Heading level={3} color="light-1">CFP Bracket Management</Heading>

      {bracket?.updatedAt && (
        <Text size="small" color="dark-4" margin={{ bottom: 'small' }}>
          Last updated: {new Date(bracket.updatedAt).toLocaleString()}
        </Text>
      )}

      <Box direction="row" gap="small" margin={{ bottom: 'medium' }}>
        <Button
          primary
          label={isRefreshing ? 'Fetching...' : `Fetch & Publish CFP Games (${year})`}
          disabled={isRefreshing}
          icon={isRefreshing ? <Spinner size="xsmall" /> : undefined}
          onClick={() => refreshAndSaveBracket(year)}
        />
      </Box>

      {bracket?.games?.length ? (
        <Box>
          <Heading level={5} color="light-1" margin={{ bottom: 'small' }}>
            {bracket?.games?.length} CFP games published
          </Heading>
          {ROUND_ORDER.map((round) => {
            const games = gamesByRound[round];
            if (!games?.length) return null;
            return (
              <Box key={round} margin={{ bottom: 'medium' }}>
                <Heading level={6} color="accent-1" margin={{ bottom: 'xsmall', top: '0' }}>
                  {ROUND_LABELS[round]} ({games.length} games)
                </Heading>
                {games.map((game) => (
                  <Box
                    key={game.id}
                    direction="row"
                    justify="between"
                    align="center"
                    pad={{ horizontal: 'small', vertical: 'xsmall' }}
                    margin={{ bottom: 'xsmall' }}
                    background="dark-2"
                    round="small"
                  >
                    <Text size="small" color="light-1">
                      {game.awayTeam} at {game.homeTeam}
                    </Text>
                    <Text size="xsmall" color="dark-4">
                      {game.pointSpread !== undefined
                        ? `Spread: ${game.pointSpread}`
                        : 'No spread yet'}
                    </Text>
                  </Box>
                ))}
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box pad="medium" align="center">
          <Text color="dark-4">
            No CFP bracket published yet. Click "Fetch & Publish" to load the current bracket.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default AdminCFP;

AdminCFP.displayName = 'AdminCFP';
