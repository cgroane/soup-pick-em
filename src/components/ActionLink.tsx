import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ActionLinkProps {
  path: string;
  text: string;
}

const ActionLink: React.FC<ActionLinkProps> = ({ path, text }: ActionLinkProps) => {
  return (
    <Link to={`${path}`} style={{ textDecoration: 'none' }}>
      <div className="flex items-center w-4/5 h-48">
        <span className="text-5xl text-primary">{text}</span>
        <ArrowRight className="h-8 w-8 text-primary ml-2" />
      </div>
    </Link>
  );
};

export default ActionLink;

ActionLink.displayName = 'ActionLink';
