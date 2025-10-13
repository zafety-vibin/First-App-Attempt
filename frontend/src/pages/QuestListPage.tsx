import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { Quest } from '../utils/validationSchemas';
import { TruncatedText } from '../components/common/TruncatedText';

/**
 * T064: Quest List Page
 * Custom column definitions for Quest table
 */
export const QuestListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Campaign ID not found</p>
      </div>
    );
  }

  const questColumns: ColumnDef<Quest>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const status = info.getValue() as string;
        return status ? status.replace('_', ' ').toUpperCase() : '-';
      },
      size: 120,
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
      accessorKey: 'objectives',
      header: 'Objectives',
      cell: (info) => {
        const objectives = info.getValue() as string[];
        return objectives && objectives.length > 0 ? `${objectives.length} objectives` : '-';
      },
      size: 110,
    },
    {
      accessorKey: 'rewards',
      header: 'Rewards',
      cell: (info) => {
        const rewards = info.getValue() as string;
        return rewards ? <TruncatedText text={rewards} maxLength={60} /> : '-';
      },
      size: 200,
    },
    {
      accessorKey: 'related_npcs',
      header: 'Related NPCs',
      cell: (info) => {
        const npcs = info.getValue() as string[];
        return npcs && npcs.length > 0 ? `${npcs.length} NPCs` : '-';
      },
      size: 120,
    },
    {
      accessorKey: 'related_locations',
      header: 'Locations',
      cell: (info) => {
        const locs = info.getValue() as string[];
        return locs && locs.length > 0 ? `${locs.length} locations` : '-';
      },
      size: 110,
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
      accessorKey: 'dm_true_objective',
      header: 'DM: True Objective',
      cell: (info) => {
        const dmObj = info.getValue() as string;
        return dmObj ? <TruncatedText text={dmObj} maxLength={80} /> : '-';
      },
      size: 250,
    },
    {
      accessorKey: 'dm_consequences',
      header: 'DM: Consequences',
      cell: (info) => {
        const dmConseq = info.getValue() as string;
        return dmConseq ? <TruncatedText text={dmConseq} maxLength={80} /> : '-';
      },
      size: 250,
    },
  ];

  return (
    <GenericCategoryListView
      category="quests"
      campaignId={campaignId}
      columns={questColumns}
      statsConfig={{
        primaryStats: 'both',
        breakdownField: 'status',
        breakdownLabel: 'Status',
        statusField: 'status',
        activeStatuses: ['not_started', 'in_progress'],
        completedStatuses: ['completed'],
      }}
    />
  );
};
