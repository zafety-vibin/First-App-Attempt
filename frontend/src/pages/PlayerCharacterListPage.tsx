import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { PlayerCharacter } from '../utils/validationSchemas';

/**
 * T066: Player Character List Page
 * Custom column definitions for Player Character table
 */
export const PlayerCharacterListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  const playerCharacterColumns: ColumnDef<PlayerCharacter>[] = [
    {
      accessorKey: 'name',
      header: 'Character Name',
      cell: (info) => info.getValue(),
      size: 180,
    },
    {
      accessorKey: 'player_name',
      header: 'Player Name',
      cell: (info) => info.getValue() || '-',
      size: 150,
    },
    {
      accessorKey: 'class',
      header: 'Class',
      cell: (info) => {
        const value = info.getValue();
        if (!value) return '-';
        try {
          const classes = typeof value === 'string' ? JSON.parse(value) : value;
          return Array.isArray(classes) ? classes.join(', ') : String(value);
        } catch {
          return String(value);
        }
      },
      size: 150,
    },
    {
      accessorKey: 'level',
      header: 'Level',
      cell: (info) => {
        const value = info.getValue();
        return value ? String(value) : '-';
      },
      size: 80,
    },
    {
      accessorKey: 'race',
      header: 'Race',
      cell: (info) => info.getValue() || '-',
      size: 120,
    },
    {
      accessorKey: 'background',
      header: 'Background',
      cell: (info) => info.getValue() || '-',
      size: 130,
    },
    {
      accessorKey: 'personality',
      header: 'Personality',
      cell: (info) => {
        const pers = info.getValue() as string;
        return pers ? (pers.length > 60 ? pers.substring(0, 60) + '...' : pers) : '-';
      },
      size: 200,
    },
    {
      accessorKey: 'goals',
      header: 'Goals',
      cell: (info) => {
        const goals = info.getValue() as string;
        return goals ? (goals.length > 80 ? goals.substring(0, 80) + '...' : goals) : '-';
      },
      size: 250,
    },
    {
      accessorKey: 'faction_affiliations',
      header: 'Factions',
      cell: (info) => {
        const factions = info.getValue() as string[];
        return factions && factions.length > 0 ? `${factions.length} factions` : '-';
      },
      size: 100,
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: (info) => {
        const tags = info.getValue() as string[];
        return tags && tags.length > 0 ? tags.join(', ') : '-';
      },
      size: 150,
    },
  ];

  return (
    <GenericCategoryListView
      category="player_characters"
      campaignId={campaignId}
      columns={playerCharacterColumns}
    />
  );
};
