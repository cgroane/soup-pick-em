import React from "react"
import { Box, Card, CardBody, Heading, Skeleton } from "grommet";
import { GameCard, ProfileCard } from "./Styled";

const options = {
    card: {
        component: Card
    },
    gameCard: {
        component: GameCard
    },
    profileCard: {
        component: ProfileCard
    }
}

interface LoadingProps {
    iterations?: number
    type: keyof typeof options;

};
const Loading = ({
  type, iterations = 1
}: LoadingProps ) => {
    const arrayOfSkels = Array.from(Array(iterations));
    const ParentComponent = options[type].component;
  return (
    <>
      {arrayOfSkels.map((_, index) => 
      <Box key={`skeleton-${index}`} pad={'medium'} align="center" >
      <ParentComponent pad={'20px'} margin={'4px'} height="small" width="large" background="light-1" >
        <Heading><Skeleton ></Skeleton></Heading>
        <CardBody>
            <Skeleton/>
        </CardBody>
      </ParentComponent>
      </Box>
      )}
    </>
  )
};

export default Loading;
