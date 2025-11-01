import React from 'react';
import { useParams } from 'react-router-dom';
import { GenericCategoryListView } from '../components/pages/GenericCategoryListView';
import { ColumnDef } from '@tanstack/react-table';
import { RelationshipCell } from '../components/table/RelationshipCell';

export const SessionPrepListPage: React.FC = () => {
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
      accessorKey: 'planned_date',
      header: 'Planned Date',
      cell: ({ row }) => {
        const plannedDate = row.original.planned_date;
        return plannedDate ? new Date(plannedDate * 1000).toLocaleDateString() : '-';
      },
      size: 200,
      meta: {
        editable: true,
        editableType: 'text',
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const status = info.getValue() as string;
        return status ? status.toUpperCase() : '-';
      },
      size: 180,
      meta: {
        editable: true,
        editableType: 'dropdown',
        dropdownOptions: [
          { value: 'planning', label: 'Planning' },
          { value: 'ready', label: 'Ready' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
        ],
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => {
        const desc = info.getValue() as string;
        return desc ? (desc.length > 100 ? desc.substring(0, 100) + '...' : desc) : '-';
      },
      size: 700,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'planned_events',
      header: 'Planned Events',
      cell: (info) => {
        const events = info.getValue() as string;
        return events ? (events.length > 80 ? events.substring(0, 80) + '...' : events) : '-';
      },
      size: 700,
      meta: {
        editable: true,
        editableType: 'textarea',
      },
    },
    {
      accessorKey: 'npcs_to_prep',
      header: 'NPCs to Prep',
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
      accessorKey: 'locations_to_prep',
      header: 'Locations to Prep',
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
      accessorKey: 'quests_to_advance',
      header: 'Quests to Advance',
      cell: (info) => {
        const quests = info.getValue() as string[];
        return (
          <RelationshipCell
            entityIds={quests || []}
            category="quests"
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
  ];

  return <GenericCategoryListView campaignId={campaignId} category="session_prep" columns={columns} />;
};
