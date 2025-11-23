import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar, CategoryType, CategoryName } from '../../contexts/SidebarContext';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import './Sidebar.css';

export interface SidebarProps {
  campaignId: string;
}

const CATEGORY_SECTIONS: Record<CategoryType, CategoryName[]> = {
  SETTING: ['lore_entries', 'world_rules'],
  LIVING_WORLD: ['npcs', 'factions', 'planar_forces', 'locations'],
  CAMPAIGN: ['session_prep', 'player_characters', 'session_recaps', 'quests'],
  EXTENDED: ['custom_mechanics', 'items', 'creatures'],
};

const SECTION_LABELS: Record<CategoryType, string> = {
  SETTING: 'Setting',
  LIVING_WORLD: 'Living World',
  CAMPAIGN: 'Campaign',
  EXTENDED: 'Extended',
};

/**
 * T058: Sidebar Navigation Component
 * Collapsible sections with 13 category links
 * Highlights active category based on route
 */
export const Sidebar: React.FC<SidebarProps> = ({ campaignId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { collapseState, activeCategory, toggleSection, setActiveCategory } = useSidebar();
  const { getCategoryLabel } = useThematicLabels(campaignId);

  const handleCategoryClick = (category: CategoryName): void => {
    setActiveCategory(category);
    navigate(`/campaigns/${campaignId}/${category}`);
  };

  const handleDashboardClick = (): void => {
    setActiveCategory(null);
    navigate(`/campaigns/${campaignId}/dashboard`);
  };

  const handlePortalClick = (): void => {
    setActiveCategory(null);
    navigate(`/campaigns/${campaignId}/portal/management`);
  };

  const handleWikiClick = (): void => {
    setActiveCategory(null);
    navigate(`/campaigns/${campaignId}`);
  };

  const handleGraphsClick = (): void => {
    setActiveCategory(null);
    navigate(`/campaigns/${campaignId}/graphs`);
  };

  const handleBibleClick = (): void => {
    setActiveCategory(null);
    navigate(`/campaigns/${campaignId}/bible`);
  };

  const handleNavigatorClick = (): void => {
    setActiveCategory('locations');
    navigate(`/campaigns/${campaignId}/locations/navigator`);
  };

  // Check if category is active based on current route
  const isCategoryActive = (category: CategoryName): boolean => {
    return location.pathname.includes(`/${category}`);
  };

  const isDashboardActive = (): boolean => {
    return location.pathname.endsWith('/dashboard');
  };

  const isPortalActive = (): boolean => {
    return location.pathname.includes('/portal/management');
  };

  const isWikiActive = (): boolean => {
    return location.pathname === `/campaigns/${campaignId}` || location.pathname === `/campaigns/${campaignId}/`;
  };

  const isGraphsActive = (): boolean => {
    return location.pathname.includes('/graphs');
  };

  const isBibleActive = (): boolean => {
    return location.pathname.includes('/bible');
  };

  const isNavigatorActive = (): boolean => {
    return location.pathname.includes('/locations/navigator');
  };

  return (
    <aside className="sidebar" role="navigation" aria-label="Campaign navigation">
      <div className="sidebar-header">
        <button
          type="button"
          className={`sidebar-item sidebar-dashboard ${isDashboardActive() ? 'active' : ''}`}
          onClick={handleDashboardClick}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`sidebar-item sidebar-graphs ${isGraphsActive() ? 'active' : ''}`}
          onClick={handleGraphsClick}
        >
          Graphs
        </button>
        <button
          type="button"
          className={`sidebar-item sidebar-bible ${isBibleActive() ? 'active' : ''}`}
          onClick={handleBibleClick}
        >
          📖 Bible
        </button>
        <button
          type="button"
          className={`sidebar-item sidebar-portal ${isPortalActive() ? 'active' : ''}`}
          onClick={handlePortalClick}
        >
          Player Portal
        </button>
        <button
          type="button"
          className={`sidebar-item sidebar-wiki ${isWikiActive() ? 'active' : ''}`}
          onClick={handleWikiClick}
        >
          Wiki
        </button>
      </div>

      <nav className="sidebar-sections">
        {(Object.keys(CATEGORY_SECTIONS) as CategoryType[]).map((sectionType) => {
          const categories = CATEGORY_SECTIONS[sectionType];
          const isCollapsed = collapseState[sectionType];

          return (
            <div key={sectionType} className="sidebar-section">
              <button
                type="button"
                className="sidebar-section-header"
                onClick={() => toggleSection(sectionType)}
                aria-expanded={!isCollapsed}
                aria-controls={`section-${sectionType}`}
              >
                <span className="sidebar-section-title">{SECTION_LABELS[sectionType]}</span>
                <span className={`sidebar-chevron ${isCollapsed ? 'collapsed' : ''}`}>
                  &#9660;
                </span>
              </button>

              {!isCollapsed && (
                <ul className="sidebar-category-list" id={`section-${sectionType}`}>
                  {categories.map((category) => {
                    const isActive = isCategoryActive(category);
                    const label = getCategoryLabel(category);

                    return (
                      <React.Fragment key={category}>
                        <li>
                          <button
                            type="button"
                            className={`sidebar-item ${isActive && !isNavigatorActive() ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(category)}
                            aria-current={isActive && !isNavigatorActive() ? 'page' : undefined}
                          >
                            {label}
                          </button>
                        </li>

                        {/* Feature 021: Geographic Navigator (locations only) */}
                        {category === 'locations' && (
                          <li className="sidebar-sub-item">
                            <button
                              type="button"
                              className={`sidebar-item sidebar-sub ${isNavigatorActive() ? 'active' : ''}`}
                              onClick={handleNavigatorClick}
                            >
                              🗺️ Geographic Navigator
                            </button>
                          </li>
                        )}
                      </React.Fragment>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
