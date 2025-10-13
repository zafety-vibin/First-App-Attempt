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
      size: 200,
    },
    {
      accessorKey: 'mechanic_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 130,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 120 ? desc.substring(0, 120) + '...' : desc) : '-';
      },
      size: 350,
    },
    {
      accessorKey: 'rules_text',
      header: 'Rules',
      cell: (info) => {
        const rules = info.getValue() as string;
        return rules ? (rules.length > 100 ? rules.substring(0, 100) + '...' : rules) : '-';
      },
      size: 300,
    },
    {
      accessorKey: 'prerequisites',
      header: 'Prerequisites',
      cell: (info) => {
        const prereq = info.getValue() as string;
        return prereq ? (prereq.length > 60 ? prereq.substring(0, 60) + '...' : prereq) : '-';
      },
      size: 200,
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: (info) => info.getValue() || '-',
      size: 130,
    },
    {
      accessorKey: 'related_rules',
      header: 'Related',
      cell: (info) => {
        const rules = info.getValue() as string[];
        return rules && rules.length > 0 ? `${rules.length} rules` : '-';
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

  return <GenericCategoryListView campaignId={campaignId} category="custom_mechanics" columns={columns} />;
};
