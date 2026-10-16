import React, { useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import type { VendorCreateInput, VendorUpdateInput, VendorSummary } from '@/types/api';

interface VendorFormProps {
  vendor?: VendorSummary;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VendorCreateInput | VendorUpdateInput) => void;
}

export const VendorForm: React.FC<VendorFormProps> = ({
  vendor,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<VendorCreateInput>>({
    name: vendor?.name || '',
    country: vendor?.country || '',
    category: vendor?.category || '',
    criticality: vendor?.criticality || 3,
    notes: vendor?.notes || '',
    aliases: vendor?.aliases?.map(a => a.alias) || [''],
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedData = {
      name: formData.name || '',
      country: formData.country || '',
      category: formData.category || '',
      criticality: formData.criticality || 3,
      notes: formData.notes || '',
      aliases: formData.aliases?.filter(a => a.trim()) || [],
    };
    onSave(cleanedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {vendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Vendor Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter vendor name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Category"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Criticality Level
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, criticality: value as any }))}
                    className={`px-3 py-2 rounded-lg border ${
                      formData.criticality === value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Vendor Aliases
              </label>
              <div className="space-y-2">
                {formData.aliases?.map((alias, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={alias}
                      onChange={(e) => {
                        const newAliases = [...(formData.aliases || [])];
                        newAliases[idx] = e.target.value;
                        setFormData(prev => ({ ...prev, aliases: newAliases }));
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Alias ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newAliases = formData.aliases?.filter((_, i) => i !== idx);
                        setFormData(prev => ({ ...prev, aliases: newAliases }));
                      }}
                      className="p-2 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    aliases: [...(prev.aliases || []), '']
                  }))}
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Alias
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Internal notes about this vendor..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {vendor ? 'Update' : 'Add'} Vendor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};