import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { NPC } from '../utils/validationSchemas';
import { TruncatedText } from '../components/common/TruncatedText';

/**
 * T061: NPC List Page
 * Custom column definitions for NPC table
 */
export const NPCListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  const npcColumns: ColumnDef<NPC>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => info.getValue(),
      size: 180,
    },
    {
      accessorKey: 'race',
      header: 'Race',
      cell: (info) => info.getValue() || '-',
      size: 120,
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
      accessorKey: 'alignment',
      header: 'Alignment',
      cell: (info) => info.getValue() || '-',
      size: 100,
    },
    {
      accessorKey: 'relationship_to_party',
      header: 'Party Relation',
      cell: (info) => info.getValue() || '-',
      size: 130,
    },
    {
      accessorKey: 'appearance',
      header: 'Appearance',
      cell: (info) => {
        const app = info.getValue() as string;
        return app ? <TruncatedText text={app} maxLength={80} /> : '-';
      },
      size: 250,
    },
    {
      accessorKey: 'personality_traits',
      header: 'Personality',
      cell: (info) => {
        const traits = info.getValue() as string;
        return traits ? <TruncatedText text={traits} maxLength={60} /> : '-';
      },
      size: 200,
    },
    {
      accessorKey: 'motivation',
      header: 'Motivation',
      cell: (info) => {
        const mot = info.getValue() as string;
        return mot ? <TruncatedText text={mot} maxLength={60} /> : '-';
      },
      size: 200,
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
    {
      accessorKey: 'dm_secrets',
      header: 'DM: Secrets',
      cell: (info) => {
        const secrets = info.getValue() as string;
        return secrets ? <TruncatedText text={secrets} maxLength={100} /> : '-';
      },
      size: 300,
    },
    {
      accessorKey: 'dm_plot_relevance',
      header: 'DM: Plot Relevance',
      cell: (info) => {
        const relevance = info.getValue() as string;
        return relevance ? <TruncatedText text={relevance} maxLength={100} /> : '-';
      },
      size: 300,
    },
  ];

  return (
    <GenericCategoryListView
      category="npcs"
      campaignId={campaignId}
      columns={npcColumns}
      statsConfig={{
        primaryStats: 'total',
        breakdownField: 'relationship_to_party',
        breakdownLabel: 'Relationships',
      }}
    />
  );
};
