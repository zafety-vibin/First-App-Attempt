/**
 * FactionRegion Component
 * Feature: 021-create-a-geographic
 * Task: T023
 *
 * Renders faction territory polygons on maps using Konva Line shapes.
 * Shows faction territory boundaries with semi-transparent fill and hover effects.
 */

import React, { useState } from 'react';
import { Line, Text, Group } from 'react-konva';

export interface FactionRegionProps {
  region: {
    id: string;
    vertices: Array<{ x: number; y: number }>;
    color: string;
    label: string | null;
    z_order: number;
  };
  onClick?: () => void;
}

const FactionRegion: React.FC<FactionRegionProps> = ({ region, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Convert vertices to flat array [x1, y1, x2, y2, ...]
  const points = region.vertices.flatMap((v) => [v.x, v.y]);

  // Calculate center point for label
  const centerX = region.vertices.reduce((sum, v) => sum + v.x, 0) / region.vertices.length;
  const centerY = region.vertices.reduce((sum, v) => sum + v.y, 0) / region.vertices.length;

  // Parse color with alpha for fill
  const hexColor = region.color;
  const fillOpacity = isHovered ? 0.4 : 0.3;

  return (
    <Group
      onClick={(e) => {
        e.cancelBubble = true; // Prevent canvas click event
        onClick?.();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Region polygon */}
      <Line
        points={points}
        closed={true}
        fill={hexColor}
        opacity={fillOpacity}
        stroke={hexColor}
        strokeWidth={isHovered ? 3 : 2}
        shadowColor="black"
        shadowBlur={isHovered ? 8 : 0}
        shadowOpacity={0.2}
      />

      {/* Label at center (only on hover) */}
      {isHovered && region.label && (
        <Text
          text={region.label}
          x={centerX}
          y={centerY}
          fontSize={14}
          fill="white"
          fontStyle="bold"
          align="center"
          verticalAlign="middle"
          offsetX={region.label.length * 3.5} // Approximate center
          offsetY={7}
          stroke={hexColor}
          strokeWidth={3}
          shadowColor="black"
          shadowBlur={4}
          shadowOpacity={0.5}
        />
      )}
    </Group>
  );
};

export default FactionRegion;
