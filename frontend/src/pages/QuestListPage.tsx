import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { Quest } from '../utils/validationSchemas';
import { TruncatedText } from '../components/common/TruncatedText';
import { RelationshipCell } from '../components/table/RelationshipCell';

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
      size: 350,
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
      size: 180,
      meta: {
        editable: true,
        editableType: 'player_knowledge',
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const status = info.getValue() as string;
        return status ? status.replace('_', ' ').toUpperCase() : '-';
      },
      size: 180,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
          { value: 'failed', label: 'Failed' },
          { value: 'on_hold', label: 'On Hold' },
        ],
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? <TruncatedText text={desc} maxLength={100} /> : '-';
      },
      size: 700,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'objectives',
      header: 'Objectives',
      cell: (info) => {
        const objectives = info.getValue() as string[];
        return objectives && objectives.length > 0 ? `${objectives.length} objectives` : '-';
      },
      size: 180,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'rewards',
      header: 'Rewards',
      cell: (info) => {
        const rewards = info.getValue() as string;
        return rewards ? <TruncatedText text={rewards} maxLength={60} /> : '-';
      },
      size: 600,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'related_npcs',
      header: 'Related NPCs',
      cell: (info) => {
        const npcs = info.getValue() as string[];
        return (
          <RelationshipCell
            entityIds={npcs || []}
            category="npcs"
            campaignId={campaignId!}
            maxDisplay={3}
          />
        );
      },
      size: 300,
      enableSorting: false,
    },
    {
      accessorKey: 'related_locations',
      header: 'Locations',
      cell: (info) => {
        const locs = info.getValue() as string[];
        return (
          <RelationshipCell
            entityIds={locs || []}
            category="locations"
            campaignId={campaignId!}
            maxDisplay={2}
          />
        );
      },
      size: 300,
      enableSorting: false,
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: (info) => {
        const tags = info.getValue() as string[];
        return tags && tags.length > 0 ? tags.join(', ') : '-';
      },
      size: 250,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'dm_true_objective',
      header: 'DM: True Objective',
      cell: (info) => {
        const dmObj = info.getValue() as string;
        return dmObj ? <TruncatedText text={dmObj} maxLength={80} /> : '-';
      },
      size: 600,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'dm_consequences',
      header: 'DM: Consequences',
      cell: (info) => {
        const dmConseq = info.getValue() as string;
        return dmConseq ? <TruncatedText text={dmConseq} maxLength={80} /> : '-';
      },
      size: 600,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
  ];

  return (
    <GenericCategoryListView
      category="quests"
      campaignId={campaignId}
      columns={questColumns}
      statsConfig={{
        primaryStats: 'total',
        breakdownField: 'status',
        breakdownLabel: 'Status',
      }}
    />
  );
};
