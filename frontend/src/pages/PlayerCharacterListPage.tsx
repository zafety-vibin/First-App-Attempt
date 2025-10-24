import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { PlayerCharacter } from '../utils/validationSchemas';
import { TruncatedText } from '../components/common/TruncatedText';

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
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'player_knowledge',
      header: 'Visibility',
      cell: (info) => {
        const value = info.getValue() as string;
        const labelMap: Record<string, string> = {
          system: 'System',
          common_knowledge: 'Common',
          player_knowledge: 'Player',
          dm_only: 'DM Only',
        };
        return labelMap[value] || value || 'Common';
      },
      size: 120,
      meta: {
        editable: true,
        editableType: 'player_knowledge',
      },
    },
    {
      accessorKey: 'player_name',
      header: 'Player Name',
      cell: (info) => info.getValue() || '-',
      size: 150,
      meta: {
        editable: true,
        editableType: 'text',
      },
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
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'level',
      header: 'Level',
      cell: (info) => {
        const value = info.getValue();
        return value ? String(value) : '-';
      },
      size: 80,
      meta: {
        editable: true,
        editableType: 'number',
      },
    },
    {
      accessorKey: 'race',
      header: 'Race',
      cell: (info) => info.getValue() || '-',
      size: 120,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'background',
      header: 'Background',
      cell: (info) => info.getValue() || '-',
      size: 130,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'personality',
      header: 'Personality',
      cell: (info) => {
        const pers = info.getValue() as string;
        return pers ? (pers.length > 60 ? pers.substring(0, 60) + '...' : pers) : '-';
      },
      size: 200,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'goals',
      header: 'Goals',
      cell: (info) => {
        const goals = info.getValue() as string;
        return goals ? (goals.length > 80 ? goals.substring(0, 80) + '...' : goals) : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'faction_affiliations',
      header: 'Factions',
      cell: (info) => {
        const factions = info.getValue() as string[];
        return factions && factions.length > 0 ? `${factions.length} factions` : '-';
      },
      size: 100,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: (info) => {
        const tags = info.getValue() as string[];
        return tags && tags.length > 0 ? tags.join(', ') : '-';
      },
      size: 150,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'dm_secrets',
      header: 'DM: Secrets',
      cell: (info) => {
        const secrets = info.getValue() as string;
        return secrets ? <TruncatedText text={secrets} maxLength={100} /> : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'dm_plot_threads',
      header: 'DM: Plot Threads',
      cell: (info) => {
        const threads = info.getValue() as string;
        return threads ? <TruncatedText text={threads} maxLength={100} /> : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'dm_true_motivation',
      header: 'DM: True Motivation',
      cell: (info) => {
        const motivation = info.getValue() as string;
        return motivation ? <TruncatedText text={motivation} maxLength={100} /> : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'dm_consequences',
      header: 'DM: Consequences',
      cell: (info) => {
        const consequences = info.getValue() as string;
        return consequences ? <TruncatedText text={consequences} maxLength={100} /> : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
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
