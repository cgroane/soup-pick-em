import React, { useCallback, useMemo } from 'react';
import { Box, Heading, Text } from 'grommet';
import styled from 'styled-components';
import { CFPRound, GamesAPIResponseOutcome, GamesAPIResult, Picks } from '../../model';
import { cfpRound } from '../../context/cfp';
import { TeamLogo } from '../Styled';

const ROUND_ORDER: CFPRound[] = ['firstRound', 'quarterfinal', 'semifinal', 'championship'];
const ROUND_LABELS: Record<CFPRound, string> = {
  firstRound: 'First Round',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  championship: 'Championship',
};
const EXPECTED_GAMES: Record<CFPRound, number> = {
  firstRound: 4,
  quarterfinal: 4,
  semifinal: 2,
  championship: 1,
};

const RoundColumn = styled(Box)`
  min-width: 180px;
`;

const GameSlot = styled(Box)<{ tbd?: boolean }>`
  border-radius: 12px;
  border: 1px solid ${({ theme, tbd }) => tbd ? '#555' : theme.colors.brand};
  background: ${({ tbd }) => tbd ? 'rgba(80,80,80,0.3)' : 'rgba(255,255,255,0.07)'};
  padding: 8px;
  margin: 6px 0;
  cursor: ${({ tbd }) => tbd ? 'default' : 'pointer'};
  width: 170px;
`;

const TeamRow = styled(Box)<{ selected?: boolean }>`
  border-radius: 8px;
  padding: 4px 8px;
  margin: 2px 0;
  cursor: pointer;
  background: ${({ selected, theme }) => selected ? theme.colors.brand : 'transparent'};
  &:hover {
    background: ${({ selected, theme }) => selected ? theme.colors.brand : 'rgba(144,209,240,0.15)'};
  }
`;

interface BracketDisplayProps {
  games: GamesAPIResult[];
  userPicks: Picks[];
  onPick: (pick: Picks) => void;
  userId: string;
}

const TBDSlot: React.FC = () => (
  <GameSlot tbd direction="column" align="center" justify="center">
    <Text size="small" color="dark-4">TBD vs TBD</Text>
    <Text size="xsmall" color="dark-5">Matchup not yet determined</Text>
  </GameSlot>
);

const GameSlotCard: React.FC<{
  game: GamesAPIResult;
  userPick: Picks | undefined;
  onPick: (pick: Picks) => void;
  userId: string;
}> = ({ game, userPick, onPick, userId }) => {
  const pastDate = useMemo(() => Date.parse(game.startDate) < Date.now(), [game.startDate]);

  const pickTeam = useCallback((outcome: GamesAPIResponseOutcome) => {
    if (pastDate) return;
    onPick({
      matchup: game.id,
      userId,
      isCorrect: false,
      week: 1,
      selection: outcome,
    });
  }, [game.id, onPick, userId, pastDate]);

  const homeOutcome = game.outcomes?.home;
  const awayOutcome = game.outcomes?.away;
  const homeSelected = userPick?.selection?.id === 1;
  const awaySelected = userPick?.selection?.id === 2;

  return (
    <GameSlot direction="column">
      <TeamRow
        direction="row"
        align="center"
        gap="xsmall"
        selected={awaySelected}
        onClick={awayOutcome && !pastDate ? () => pickTeam(awayOutcome) : undefined}
      >
        {game.awayTeamData?.logos?.[0] && (
          <TeamLogo src={game.awayTeamData.logos[0]} fit="contain" style={{ width: '1.5rem', height: '1.5rem' }} />
        )}
        <Box flex>
          <Text size="xsmall" weight={awaySelected ? 'bold' : 'normal'} color={awaySelected ? 'white' : 'light-1'}>
            {game.awayTeam}
          </Text>
          {awayOutcome && (
            <Text size="xsmall" color="accent-1">{awayOutcome.point}</Text>
          )}
        </Box>
      </TeamRow>

      <Text size="xsmall" color="dark-4" textAlign="center">at</Text>

      <TeamRow
        direction="row"
        align="center"
        gap="xsmall"
        selected={homeSelected}
        onClick={homeOutcome && !pastDate ? () => pickTeam(homeOutcome) : undefined}
      >
        {game.homeTeamData?.logos?.[0] && (
          <TeamLogo src={game.homeTeamData.logos[0]} fit="contain" style={{ width: '1.5rem', height: '1.5rem' }} />
        )}
        <Box flex>
          <Text size="xsmall" weight={homeSelected ? 'bold' : 'normal'} color={homeSelected ? 'white' : 'light-1'}>
            {game.homeTeam}
          </Text>
          {homeOutcome && (
            <Text size="xsmall" color="accent-1">{homeOutcome.point}</Text>
          )}
        </Box>
      </TeamRow>

      {pastDate && (
        <Text size="xsmall" color="dark-4" textAlign="center" margin={{ top: '4px' }}>
          {game.completed ? `${game.awayPoints} - ${game.homePoints}` : 'In Progress'}
        </Text>
      )}
    </GameSlot>
  );
};

const BracketDisplay: React.FC<BracketDisplayProps> = ({ games, userPicks, onPick, userId }) => {
  const gamesByRound = useMemo(() => {
    const map: Partial<Record<CFPRound, GamesAPIResult[]>> = {};
    games.forEach((g) => {
      const round = cfpRound(g);
      if (!map[round]) map[round] = [];
      map[round]!.push(g);
    });
    return map;
  }, [games]);

  return (
    <Box direction="row" gap="medium" overflow={{ horizontal: 'auto' }} pad="medium">
      {ROUND_ORDER.map((round) => {
        const roundGames = gamesByRound[round] ?? [];
        const expected = EXPECTED_GAMES[round];
        const tbdCount = Math.max(0, expected - roundGames.length);

        return (
          <RoundColumn key={round} direction="column" align="center">
            <Heading level={5} margin={{ bottom: '8px', top: '0' }} color="light-1">
              {ROUND_LABELS[round]}
            </Heading>
            {roundGames.map((game) => (
              <GameSlotCard
                key={game.id}
                game={game}
                userPick={userPicks.find((p) => p.matchup === game.id)}
                onPick={onPick}
                userId={userId}
              />
            ))}
            {Array.from({ length: tbdCount }).map((_, i) => (
              <TBDSlot key={`tbd-${round}-${i}`} />
            ))}
          </RoundColumn>
        );
      })}
    </Box>
  );
};

export default BracketDisplay;

BracketDisplay.displayName = 'BracketDisplay';
