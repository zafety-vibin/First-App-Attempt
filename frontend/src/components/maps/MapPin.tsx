/**
 * MapPin Component
 * Feature: 021-create-a-geographic
 * Task: T022
 *
 * Renders a clickable pin on the map using Konva shapes.
 * Shows icon/color and tooltip on hover, triggers navigation on click.
 */

import React, { useState } from 'react';
import { Circle, Text, Group } from 'react-konva';

export interface MapPinProps {
  pin: {
    id: string;
    x: number;
    y: number;
    icon: string | null;
    color: string | null;
    label: string | null;
  };
  onClick?: () => void;
}

// Icon mapping (emoji/symbols for prototype)
const PIN_ICONS: Record<string, string> = {
  castle: '🏰',
  city: '🏙️',
  town: '🏘️',
  village: '🏡',
  dungeon: '⚔️',
  cave: '🕳️',
  mountain: '⛰️',
  forest: '🌲',
  desert: '🏜️',
  water: '💧',
  landmark: '📍',
  temple: '⛩️',
  tower: '🗼',
  port: '⚓',
  bridge: '🌉',
  ruins: '🏛️',
  camp: '⛺',
  mine: '⛏️',
  farm: '🌾',
  person: '👤',
  other: '📌',
};

const MapPin: React.FC<MapPinProps> = ({ pin, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const pinColor = pin.color || '#3B82F6';
  const pinIcon = pin.icon ? PIN_ICONS[pin.icon] || PIN_ICONS.other : PIN_ICONS.other;
  const pinRadius = isHovered ? 18 : 15;

  return (
    <Group
      x={pin.x}
      y={pin.y}
      onClick={(e) => {
        e.cancelBubble = true; // Prevent canvas click event
        onClick?.();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pin circle background */}
      <Circle
        radius={pinRadius}
        fill={pinColor}
        stroke="white"
        strokeWidth={2}
        shadowColor="black"
        shadowBlur={isHovered ? 10 : 5}
        shadowOpacity={0.3}
        shadowOffsetY={2}
        opacity={isHovered ? 1 : 0.9}
      />

      {/* Icon text (emoji) */}
      <Text
        text={pinIcon}
        fontSize={20}
        fill="white"
        align="center"
        verticalAlign="middle"
        offsetX={10}
        offsetY={10}
        width={20}
        height={20}
      />

      {/* Tooltip on hover */}
      {isHovered && pin.label && (
        <Group>
          {/* Tooltip background */}
          <Text
            text={pin.label}
            fontSize={14}
            fill="#1f2937"
            padding={8}
            y={-40}
            offsetX={pin.label.length * 3.5} // Approximate center alignment
            background="white"
            cornerRadius={4}
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.2}
            shadowOffsetY={2}
          />
        </Group>
      )}
    </Group>
  );
};

export default MapPin;
