/**
 * Campaign Layout - Wrapper for all campaign pages with AI sidebar access
 * Provides Import/Planning AI buttons that are always accessible
 * Feature: 005-create-the-ai
 */

import React, { useState, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { AISidebar } from './AISidebar';

interface CampaignLayoutProps {
  children: ReactNode;
  hideAIButtons?: boolean;
}

export function CampaignLayout({ children, hideAIButtons = false }: CampaignLayoutProps) {
  const { id: campaignId, campaignId: campaignIdAlt } = useParams<{ id?: string; campaignId?: string }>();
  const activeCampaignId = campaignId || campaignIdAlt;

  const [sidebarType, setSidebarType] = useState<'import' | 'planning' | null>(null);

  const openImportSidebar = () => setSidebarType('import');
  const openPlanningSidebar = () => setSidebarType('planning');
  const closeSidebar = () => setSidebarType(null);

  // Add a data attribute to document body to communicate sidebar state to fixed elements
  React.useEffect(() => {
    if (sidebarType) {
      document.body.setAttribute('data-sidebar-open', 'true');
    } else {
      document.body.removeAttribute('data-sidebar-open');
    }
  }, [sidebarType]);

  if (!activeCampaignId) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* AI Action Buttons - Fixed at top of page */}
      {!hideAIButtons && (
        <div className="fixed top-4 right-4 z-30 flex gap-2">
          <button
            onClick={openImportSidebar}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
            title="Import AI"
          >
            📥 Import
          </button>
          <button
            onClick={openPlanningSidebar}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
            title="Planning AI"
          >
            🗺️ Planning
          </button>
        </div>
      )}

      {/* Main Content - shifts left when sidebar opens */}
      <div
        style={{
          marginRight: sidebarType ? '400px' : '0',
          transition: 'margin-right 0.3s ease-in-out'
        }}
      >
        {children}
      </div>

      {/* AI Sidebar */}
      {sidebarType && (
        <AISidebar
          type={sidebarType}
          campaignId={activeCampaignId}
          isOpen={true}
          onClose={closeSidebar}
        />
      )}
    </div>
  );
}
