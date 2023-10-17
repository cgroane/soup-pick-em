import React from 'react'
import styled from 'styled-components'

const Text = styled.span`
  background: ${({theme}) => theme.colors.blue};
`
 
interface TestComponentProps {
  test: boolean;
}
const TestComponent: React.FC<TestComponentProps> = ({ test }: TestComponentProps) => {
  return (
    <Text>{test} test</Text>
  )
}
 
export default TestComponent
 
TestComponent.displayName = "TestComponent"