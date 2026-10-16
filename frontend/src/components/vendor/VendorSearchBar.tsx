import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface VendorSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  riskFilter?: 'all' | 'low' | 'medium' | 'high' | 'critical';
  onRiskFilterChange?: (filter: string) => void;
  trustFilter?: 'all' | 'official' | 'unverified';
  onTrustFilterChange?: (filter: string) => void;
  onResetFilters: () => void;
  showFilters?: boolean;
}

export const VendorSearchBar: React.FC<VendorSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  riskFilter = 'all',
  onRiskFilterChange,
  trustFilter = 'all',
  onTrustFilterChange,
  onResetFilters,
  showFilters = true,
}) => {
  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search vendors by name, country, or category..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {showFilters && (
          <button
            type="button"
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        )}
      </div>

      {/* Filters Bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Risk Filter */}
          {onRiskFilterChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase">Risk:</span>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/50 p-0.5">
                {['all', 'low', 'medium', 'high', 'critical'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onRiskFilterChange(level)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${riskFilter === level
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trust Filter */}
          {onTrustFilterChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase">Source:</span>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/50 p-0.5">
                {['all', 'official', 'unverified'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onTrustFilterChange(level)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${trustFilter === level
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {level === 'all' ? 'All' : level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters Info */}
          {(riskFilter !== 'all' || trustFilter !== 'all') && (
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                Active filters:
              </span>
              <span className="font-medium">{riskFilter !== 'all' ? `${riskFilter} ` : ''}</span>
              <span className="font-medium">{trustFilter !== 'all' ? `${trustFilter} ` : ''}</span>
              <button
                type="button"
                onClick={onResetFilters}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};