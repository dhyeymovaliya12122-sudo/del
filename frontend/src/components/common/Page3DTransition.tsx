import React from 'react';

interface Props {
  currentRoute?: string;
  children: React.ReactNode;
}

/**
 * Page3DTransition - Replaced 3D portal animations and perspective transforms with zero-overhead container.
 */
export const Page3DTransition: React.FC<Props> = ({ children }) => {
  return <div className="page-standard-wrapper" style={{ width: '100%', minHeight: '100vh' }}>{children}</div>;
};

export default Page3DTransition;
