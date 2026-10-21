import { useRef } from 'react';

interface TiltOptions {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
}

/**
 * use3DTilt - Neutralized to eliminate mousemove listeners, 3D matrix math, and perspective transforms.
 */
export function use3DTilt<T extends HTMLElement>(_options: TiltOptions = {}) {
  const ref = useRef<T>(null);
  return ref;
}

export default use3DTilt;
