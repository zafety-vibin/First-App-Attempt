import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { TruncatedText } from '../components/common/TruncatedText';

export const PlanarForceListPage: React.FC = () => {
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
      accessorKey: 'entity_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 120,
    },
    {
      accessorKey: 'domains',
      header: 'Domains',
      cell: ({ row }) => {
        const domains = row.original.domains;
        return Array.isArray(domains) ? domains.join(', ') : domains || '-';
      },
      size: 180,
    },
    {
      accessorKey: 'alignment',
      header: 'Alignment',
      cell: (info) => info.getValue() || '-',
      size: 110,
    },
    {
      accessorKey: 'plane_of_origin',
      header: 'Plane',
      cell: (info) => info.getValue() || '-',
      size: 150,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 100 ? desc.substring(0, 100) + '...' : desc) : '-';
      },
      size: 300,
    },
    {
      accessorKey: 'worshiper_base',
      header: 'Worshipers',
      cell: (info) => {
        const worshipers = info.getValue() as string;
        return worshipers ? (worshipers.length > 60 ? worshipers.substring(0, 60) + '...' : worshipers) : '-';
      },
      size: 200,
    },
    {
      accessorKey: 'religious_orders',
      header: 'Orders',
      cell: (info) => {
        const orders = info.getValue() as string[];
        return orders && orders.length > 0 ? `${orders.length} orders` : '-';
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
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'dm_true_nature',
      header: 'DM: True Nature',
      cell: (info) => {
        const trueNature = info.getValue() as string;
        return trueNature ? <TruncatedText text={trueNature} maxLength={100} /> : '-';
      },
      size: 250,
    },
  ];

  return <GenericCategoryListView campaignId={campaignId} category="planar_forces" columns={columns} />;
};
