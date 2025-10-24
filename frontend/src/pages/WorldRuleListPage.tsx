import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';

export const WorldRuleListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return <div>Error: Campaign ID not found</div>;
  }

  const columns: ColumnDef<any>[] = [
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
      accessorKey: 'rule_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 220,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'physical_law', label: 'Physical Law' },
          { value: 'magical_law', label: 'Magical Law' },
          { value: 'divine_law', label: 'Divine Law' },
          { value: 'societal_norm', label: 'Societal Norm' },
          { value: 'cosmic_principle', label: 'Cosmic Principle' },
          { value: 'game_mechanic', label: 'Game Mechanic' },
        ],
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 150 ? desc.substring(0, 150) + '...' : desc) : '-';
      },
      size: 700,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'exceptions',
      header: 'Exceptions',
      cell: (info) => {
        const exc = info.getValue() as string;
        return exc ? (exc.length > 80 ? exc.substring(0, 80) + '...' : exc) : '-';
      },
      size: 600,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'related_rules',
      header: 'Related Rules',
      cell: (info) => {
        const rules = info.getValue() as string[];
        return rules && rules.length > 0 ? `${rules.length} rules` : '-';
      },
      size: 200,
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
      size: 250,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
  ];

  return <GenericCategoryListView campaignId={campaignId} category="world_rules" columns={columns} />;
};
