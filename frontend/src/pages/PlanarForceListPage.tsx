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
      accessorKey: 'entity_type',
      header: 'Type',
      cell: (info) => info.getValue() || '-',
      size: 200,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'deity', label: 'Deity' },
          { value: 'demon_lord', label: 'Demon Lord' },
          { value: 'archdevil', label: 'Archdevil' },
          { value: 'primordial', label: 'Primordial' },
          { value: 'fey_lord', label: 'Fey Lord' },
          { value: 'elder_evil', label: 'Elder Evil' },
          { value: 'cosmic_entity', label: 'Cosmic Entity' },
        ],
      },
    },
    {
      accessorKey: 'domains',
      header: 'Domains',
      cell: ({ row }) => {
        const domains = row.original.domains;
        return Array.isArray(domains) ? domains.join(', ') : domains || '-';
      },
      size: 300,
      meta: {
        editable: true,
        editableType: 'tags',
      },
    },
    {
      accessorKey: 'alignment',
      header: 'Alignment',
      cell: (info) => info.getValue() || '-',
      size: 180,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'lawful_good', label: 'Lawful Good' },
          { value: 'neutral_good', label: 'Neutral Good' },
          { value: 'chaotic_good', label: 'Chaotic Good' },
          { value: 'lawful_neutral', label: 'Lawful Neutral' },
          { value: 'true_neutral', label: 'True Neutral' },
          { value: 'chaotic_neutral', label: 'Chaotic Neutral' },
          { value: 'lawful_evil', label: 'Lawful Evil' },
          { value: 'neutral_evil', label: 'Neutral Evil' },
          { value: 'chaotic_evil', label: 'Chaotic Evil' },
        ],
      },
    },
    {
      accessorKey: 'plane_of_origin',
      header: 'Plane',
      cell: (info) => info.getValue() || '-',
      size: 250,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 100 ? desc.substring(0, 100) + '...' : desc) : '-';
      },
      size: 450,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'worshiper_base',
      header: 'Worshipers',
      cell: (info) => {
        const worshipers = info.getValue() as string;
        return worshipers ? (worshipers.length > 60 ? worshipers.substring(0, 60) + '...' : worshipers) : '-';
      },
      size: 350,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'religious_orders',
      header: 'Orders',
      cell: (info) => {
        const orders = info.getValue() as string[];
        return orders && orders.length > 0 ? `${orders.length} orders` : '-';
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
    {
      accessorKey: 'dm_true_nature',
      header: 'DM: True Nature',
      cell: (info) => {
        const trueNature = info.getValue() as string;
        return trueNature ? <TruncatedText text={trueNature} maxLength={100} /> : '-';
      },
      size: 400,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
  ];

  return <GenericCategoryListView campaignId={campaignId} category="planar_forces" columns={columns} />;
};
