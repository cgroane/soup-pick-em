import { Card, Image } from "grommet";
import styled from "styled-components";

export const GameCard = styled(Card)`
  height: 18rem;
`;
export const TeamLogo = styled(Image)`
  width: 3rem;
  height: 3rem;
  position: relative;
  opacity: 1;
`;

export const ProfileCard = styled(Card)`
  ${({ pad = '1rem', width = '90%', margin = '1rem auto'}) => `
      padding: ${pad};
      pad: ${pad};
      margin: ${margin};
      width: ${width};
  `}
`;
export {};