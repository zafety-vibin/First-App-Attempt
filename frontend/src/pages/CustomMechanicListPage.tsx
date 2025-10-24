import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';

export const CustomMechanicListPage: React.FC = () => {
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
      accessorKey: 'mechanic_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 220,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'feat', label: 'Feat' },
          { value: 'spell', label: 'Spell' },
          { value: 'class_feature', label: 'Class Feature' },
          { value: 'item_property', label: 'Item Property' },
          { value: 'environmental', label: 'Environmental' },
          { value: 'subsystem', label: 'Subsystem' },
        ],
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 120 ? desc.substring(0, 120) + '...' : desc) : '-';
      },
      size: 550,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'rules_text',
      header: 'Rules',
      cell: (info) => {
        const rules = info.getValue() as string;
        return rules ? (rules.length > 100 ? rules.substring(0, 100) + '...' : rules) : '-';
      },
      size: 500,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'prerequisites',
      header: 'Prerequisites',
      cell: (info) => {
        const prereq = info.getValue() as string;
        return prereq ? (prereq.length > 60 ? prereq.substring(0, 60) + '...' : prereq) : '-';
      },
      size: 350,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: (info) => info.getValue() || '-',
      size: 220,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'related_rules',
      header: 'Related',
      cell: (info) => {
        const rules = info.getValue() as string[];
        return rules && rules.length > 0 ? `${rules.length} rules` : '-';
      },
      size: 180,
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

  return <GenericCategoryListView campaignId={campaignId} category="custom_mechanics" columns={columns} />;
};
