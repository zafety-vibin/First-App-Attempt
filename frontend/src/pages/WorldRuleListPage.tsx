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
      size: 200,
    },
    {
      accessorKey: 'rule_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 130,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 150 ? desc.substring(0, 150) + '...' : desc) : '-';
      },
      size: 400,
    },
    {
      accessorKey: 'exceptions',
      header: 'Exceptions',
      cell: (info) => {
        const exc = info.getValue() as string;
        return exc ? (exc.length > 80 ? exc.substring(0, 80) + '...' : exc) : '-';
      },
      size: 250,
    },
    {
      accessorKey: 'related_rules',
      header: 'Related Rules',
      cell: (info) => {
        const rules = info.getValue() as string[];
        return rules && rules.length > 0 ? `${rules.length} rules` : '-';
      },
      size: 120,
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

  return <GenericCategoryListView campaignId={campaignId} category="world_rules" columns={columns} />;
};
