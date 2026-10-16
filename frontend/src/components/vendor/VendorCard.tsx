import React from 'react';
import type { VendorSummary } from '@/types/api';
import { RiskBadge, CriticalityBadge } from '../common/Badges';
import { Building2, ExternalLink } from 'lucide-react';

interface VendorCardProps {
  vendor: VendorSummary;
  onViewDetail: (id: number) => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({ vendor, onViewDetail }) => {
  return (
    <article
      className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow p-5"
      onClick={() => onViewDetail(vendor.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{vendor.name}</h3>
            {vendor.aliases && vendor.aliases.length > 0 && (
              <p className="text-xs text-slate-500 truncate max-w-[200px]">
                {vendor.aliases.map((a) => a.alias).join(', ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ExternalLink className="w-4 h-4 text-slate-400 hover:text-slate-600" />
        </div>
      </div>

      {/* Criticality Tag */}
      {vendor.criticality && (
        <div className="mb-4">
          <CriticalityBadge value={vendor.criticality} />
        </div>
      )}

      {/* Details Grid */}
      <div className="space-y-3">
        {vendor.country && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Building2 className="w-3 h-3" />
            </span>
            <span>{vendor.country}</span>
          </div>
        )}
        {vendor.category && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-slate-400">Category:</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
              {vendor.category}
            </span>
          </div>
        )}
        {vendor.notes && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            {vendor.notes}
          </div>
        )}
      </div>

      {/* Risk Level with Score */}
      {vendor.currentLevel || vendor.currentScore !== null && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Risk Level
            </span>
            <div className="flex items-center gap-4">
              {vendor.currentLevel && (
                <span className="text-[10px] text-slate-400">
                  Scored {vendor.scoredAt ? new Date(vendor.scoredAt).toLocaleDateString() : ''}
                </span>
              )}
              <RiskBadge
                level={vendor.currentLevel}
                score={vendor.currentScore}
                size="sm"
                showScore={true}
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
};