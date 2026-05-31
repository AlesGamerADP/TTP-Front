// Mock para next/image en tests
import React from 'react';

const Image = ({
  src,
  alt,
  ...props
}: {
  src: string;
  alt: string;
  [key: string]: any;
}) => {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} {...props} />;
};

export default Image;

