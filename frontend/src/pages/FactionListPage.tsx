import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { Faction } from '../utils/validationSchemas';
import { TruncatedText } from '../components/common/TruncatedText';

/**
 * T063: Faction List Page
 * Custom column definitions for Faction table
 */
export const FactionListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  const factionColumns: ColumnDef<Faction>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: 'faction_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 120,
    },
    {
      accessorKey: 'power_level',
      header: 'Power',
      cell: (info) => info.getValue() || '-',
      size: 100,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? <TruncatedText text={desc} maxLength={100} /> : '-';
      },
      size: 300,
    },
    {
      accessorKey: 'goals',
      header: 'Goals',
      cell: (info) => {
        const goals = info.getValue() as string;
        return goals ? <TruncatedText text={goals} maxLength={80} /> : '-';
      },
      size: 250,
    },
    {
      accessorKey: 'resources',
      header: 'Resources',
      cell: (info) => {
        const res = info.getValue() as string;
        return res ? <TruncatedText text={res} maxLength={60} /> : '-';
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
      accessorKey: 'dm_true_agenda',
      header: 'DM: True Agenda',
      cell: (info) => {
        const agenda = info.getValue() as string;
        return agenda ? <TruncatedText text={agenda} maxLength={100} /> : '-';
      },
      size: 300,
    },
  ];

  return (
    <GenericCategoryListView
      category="factions"
      campaignId={campaignId}
      columns={factionColumns}
      statsConfig={{
        primaryStats: 'total',
        breakdownField: 'faction_type',
        breakdownLabel: 'Types',
      }}
    />
  );
};
