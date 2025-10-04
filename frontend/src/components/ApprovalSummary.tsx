/**
 * Approval Summary - UI for reviewing and approving import session results
 * References:
 * - specs/005-create-the-ai/plan.md T052
 * - specs/005-create-the-ai/research.md lines 286-311
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Package, GitBranch, FileText } from 'lucide-react';

export interface ApprovalSummaryData {
  session_id: string;
  entities_extracted: number;
  cards_to_create: Array<{
    title: string;
    card_type: string;
    information_level: string;
  }>;
  nodes_to_add: {
    geographical: number;
    political_web: number;
    world_foundations: number;
    campaign_story: number;
  };
  edges_to_add: {
    geographical: number;
    political_web: number;
    world_foundations: number;
    campaign_story: number;
  };
  timeline_conflicts: Array<{
    entity: string;
    conflict: string;
    existing_date: string;
    proposed_date: string;
  }>;
  deduplication_summary: {
    exact_matches: number;
    fuzzy_matches: number;
    merged_entities: number;
  };
}

interface ApprovalSummaryProps {
  summary: ApprovalSummaryData;
  onApprove: () => Promise<void>;
  onReject: () => void;
}

export function ApprovalSummary({ summary, onApprove, onReject }: ApprovalSummaryProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [expandedCards, setExpandedCards] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve changes. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const totalNodes = Object.values(summary.nodes_to_add).reduce((sum, count) => sum + count, 0);
  const totalEdges = Object.values(summary.edges_to_add).reduce((sum, count) => sum + count, 0);
  const hasConflicts = summary.timeline_conflicts.length > 0;

  return (
    <div className="bg-white border rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-blue-500" />
        Import Summary - Ready for Approval
      </h3>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-2xl font-bold text-blue-600">{summary.entities_extracted}</div>
          <div className="text-sm text-gray-600">Entities Extracted</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-2xl font-bold text-green-600">{summary.cards_to_create.length}</div>
          <div className="text-sm text-gray-600">Cards to Create</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-2xl font-bold text-purple-600">{totalNodes}</div>
          <div className="text-sm text-gray-600">Graph Nodes</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-2xl font-bold text-indigo-600">{totalEdges}</div>
          <div className="text-sm text-gray-600">Graph Edges</div>
        </div>
      </div>

      {/* Timeline Conflicts Warning */}
      {hasConflicts && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Timeline Conflicts Detected ({summary.timeline_conflicts.length})
          </h4>
          <div className="space-y-2 text-sm">
            {summary.timeline_conflicts.slice(0, 3).map((conflict, index) => (
              <div key={index} className="text-yellow-700">
                <span className="font-medium">{conflict.entity}:</span> {conflict.conflict}
                <div className="text-xs mt-1">
                  Existing: {conflict.existing_date} → Proposed: {conflict.proposed_date}
                </div>
              </div>
            ))}
            {summary.timeline_conflicts.length > 3 && (
              <div className="text-yellow-600 italic">
                ...and {summary.timeline_conflicts.length - 3} more conflicts
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deduplication Summary */}
      {summary.deduplication_summary.merged_entities > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-800 mb-2">Deduplication Applied</h4>
          <div className="text-sm text-blue-700">
            <div>Exact matches found: {summary.deduplication_summary.exact_matches}</div>
            <div>Fuzzy matches found: {summary.deduplication_summary.fuzzy_matches}</div>
            <div className="font-semibold mt-1">
              Total entities merged: {summary.deduplication_summary.merged_entities}
            </div>
          </div>
        </div>
      )}

      {/* Cards to Create */}
      <div className="mb-6">
        <button
          onClick={() => setExpandedCards(!expandedCards)}
          className="font-semibold mb-2 flex items-center gap-2 hover:text-blue-600 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Cards to Create ({summary.cards_to_create.length})
          <span className="text-sm text-gray-500 ml-1">
            {expandedCards ? '(click to collapse)' : '(click to expand)'}
          </span>
        </button>
        {expandedCards && (
          <div className="border rounded p-3 max-h-60 overflow-y-auto">
            <div className="space-y-1">
              {summary.cards_to_create.map((card, index) => (
                <div key={index} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="font-medium">{card.title}</span>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-gray-100 rounded">{card.card_type}</span>
                    <span className="px-2 py-1 bg-blue-100 rounded">{card.information_level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Graph Updates */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Knowledge Graph Updates
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="border rounded p-2">
            <span className="font-medium">Geographical:</span>
            <span className="ml-2">{summary.nodes_to_add.geographical} nodes, {summary.edges_to_add.geographical} edges</span>
          </div>
          <div className="border rounded p-2">
            <span className="font-medium">Political-Web:</span>
            <span className="ml-2">{summary.nodes_to_add.political_web} nodes, {summary.edges_to_add.political_web} edges</span>
          </div>
          <div className="border rounded p-2">
            <span className="font-medium">World-Foundations:</span>
            <span className="ml-2">{summary.nodes_to_add.world_foundations} nodes, {summary.edges_to_add.world_foundations} edges</span>
          </div>
          <div className="border rounded p-2">
            <span className="font-medium">Campaign-Story:</span>
            <span className="ml-2">{summary.nodes_to_add.campaign_story} nodes, {summary.edges_to_add.campaign_story} edges</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onReject}
          disabled={isApproving}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Reject Changes
        </button>
        <button
          onClick={handleApprove}
          disabled={isApproving}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {isApproving ? 'Approving...' : 'Approve & Apply'}
        </button>
      </div>
    </div>
  );
}