import React from 'react';

interface TestComponentProps {
  test: boolean;
}

const TestComponent: React.FC<TestComponentProps> = ({ test }: TestComponentProps) => {
  return <span className="text-primary">{test} test</span>;
};

export default TestComponent;

TestComponent.displayName = 'TestComponent';
