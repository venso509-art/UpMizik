import React, { useMemo } from 'react';
import { generateQRMatrix } from '../utils/qrGenerator';

interface QRCodeDisplayProps {
  id?: string;
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  id,
  value,
  size = 150,
  fgColor = '#000000',
  bgColor = '#ffffff',
  className = ''
}) => {
  const matrix = useMemo(() => {
    return generateQRMatrix(value);
  }, [value]);

  const moduleCount = matrix.length;
  if (moduleCount === 0) return null;

  // Build SVG rects
  const rects: React.ReactElement[] = [];
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c}
            y={r}
            width={1}
            height={1}
            fill={fgColor}
          />
        );
      }
    }
  }

  return (
    <svg
      id={id}
      viewBox={`0 0 ${moduleCount} ${moduleCount}`}
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px`, backgroundColor: bgColor }}
      className={`shape-rendering-crispEdges ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={moduleCount} height={moduleCount} fill={bgColor} />
      {rects}
    </svg>
  );
};
