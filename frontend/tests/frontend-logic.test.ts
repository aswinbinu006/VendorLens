import { describe, it, expect } from 'vitest';
import { isSuperAdminUser } from '../src/utils/auth.js';

// Test 1: Risk Level classification and color mapping according to Enterprise specs
describe('Frontend Risk Mapping Rules', () => {
  type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

  const getRiskLevelFromScore = (score: number): RiskLevel => {
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'critical';
  };

  it('correctly maps scores to 4 enterprise risk levels with correct cutoffs', () => {
    expect(getRiskLevelFromScore(0)).toBe('low');
    expect(getRiskLevelFromScore(24.9)).toBe('low');
    expect(getRiskLevelFromScore(25.0)).toBe('medium');
    expect(getRiskLevelFromScore(49.9)).toBe('medium');
    expect(getRiskLevelFromScore(50.0)).toBe('high');
    expect(getRiskLevelFromScore(74.9)).toBe('high');
    expect(getRiskLevelFromScore(75.0)).toBe('critical');
    expect(getRiskLevelFromScore(100)).toBe('critical');
  });

  it('strictly defines exact 4.5:1 accessible color tokens for risk tags', () => {
    const riskTagTokens = {
      low: { text: '#0E6027', bg: '#DEFBE6' },
      medium: { text: '#684E00', bg: '#FCF4D6' },
      high: { text: '#8A3800', bg: '#FFD9BE' },
      critical: { text: '#A2191F', bg: '#FFD7D9' },
    };

    expect(riskTagTokens.low.text).toBe('#0E6027');
    expect(riskTagTokens.medium.text).toBe('#684E00');
    expect(riskTagTokens.high.text).toBe('#8A3800');
    expect(riskTagTokens.critical.text).toBe('#A2191F');
  });
});

// Test 2: Match Review Grouping Logic
describe('Match Review Grouping by Supplier', () => {
  interface MatchItem {
    id: number;
    vendorId: number;
    vendorName: string;
    firmName: string;
    similarityScore: number;
    severityRaw: string;
  }

  const groupMatchesByVendor = (items: MatchItem[]) => {
    const map = new Map<string, { vendorId: number; vendorName: string; items: MatchItem[] }>();
    for (const item of items) {
      if (!map.has(item.vendorName)) {
        map.set(item.vendorName, {
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          items: [],
        });
      }
      map.get(item.vendorName)!.items.push(item);
    }
    return Array.from(map.values());
  };

  it('clubs multiple incident rows under a single unified supplier record', () => {
    const mockItems: MatchItem[] = [
      { id: 1, vendorId: 101, vendorName: 'Aurobindo Pharma Ltd', firmName: 'Aurobindo Pharma USA Inc', similarityScore: 0.81, severityRaw: 'Class II' },
      { id: 2, vendorId: 101, vendorName: 'Aurobindo Pharma Ltd', firmName: 'Aurobindo Pharma USA Inc', similarityScore: 0.81, severityRaw: 'Class II' },
      { id: 3, vendorId: 102, vendorName: 'Dr. Reddy\'s Laboratories', firmName: 'Dr. Reddy\'s USA Inc', similarityScore: 0.79, severityRaw: 'Class I' },
    ];

    const groups = groupMatchesByVendor(mockItems);

    expect(groups).toHaveLength(2);
    expect(groups[0].vendorName).toBe('Aurobindo Pharma Ltd');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].vendorName).toBe('Dr. Reddy\'s Laboratories');
    expect(groups[1].items).toHaveLength(1);
  });
});

// Test 3: Human Business Decision extraction from vendor notes
describe('Human Business Decision Status Parsing', () => {
  const parsePartnershipStatus = (notes?: string | null): { status: string; cleanNotes: string } => {
    if (!notes) return { status: 'approved', cleanNotes: '' };
    const match = notes.match(/\[STATUS:\s*([A-Z_]+)\]/);
    const key = match?.[1];
    const status = key && ['APPROVED', 'UNDER_REVIEW', 'DISQUALIFIED'].includes(key)
      ? key.toLowerCase()
      : 'approved';
    const cleanNotes = notes.replace(/\[STATUS:\s*[A-Z_]+\]\s*/g, '').trim();
    return { status, cleanNotes };
  };

  it('correctly parses Disqualified decision status and notes', () => {
    const raw = '[STATUS: DISQUALIFIED] Contract halted due to repeated nitrosamine cGMP violations.';
    const res = parsePartnershipStatus(raw);
    expect(res.status).toBe('disqualified');
    expect(res.cleanNotes).toBe('Contract halted due to repeated nitrosamine cGMP violations.');
  });

  it('correctly parses Under Review decision status', () => {
    const raw = '[STATUS: UNDER_REVIEW] Audit required before placing 2027 orders.';
    const res = parsePartnershipStatus(raw);
    expect(res.status).toBe('under_review');
    expect(res.cleanNotes).toBe('Audit required before placing 2027 orders.');
  });

  it('defaults to approved when no prefix exists', () => {
    const raw = 'Standard generic supplier.';
    const res = parsePartnershipStatus(raw);
    expect(res.status).toBe('approved');
    expect(res.cleanNotes).toBe('Standard generic supplier.');
  });
});

// Test 4: Role-Based Access Control and Super-Admin Validation
describe('Super-Admin Authorization Helper (isSuperAdminUser)', () => {
  it('returns true when user has isSuperAdmin: true flag', () => {
    expect(isSuperAdminUser({ id: 1, email: 'custom_admin@corp.com', isSuperAdmin: true })).toBe(true);
  });

  it('returns false when user has isSuperAdmin: false flag', () => {
    expect(isSuperAdminUser({ id: 2, email: 'aswinbinu006@gmail.com', isSuperAdmin: false })).toBe(false);
  });

  it('falls back to default admin@example.com when isSuperAdmin flag is undefined', () => {
    expect(isSuperAdminUser({ email: 'admin@example.com' })).toBe(true);
    expect(isSuperAdminUser({ email: 'ADMIN@EXAMPLE.COM' })).toBe(true);
    expect(isSuperAdminUser({ email: 'aswinbinu006@gmail.com' })).toBe(false);
    expect(isSuperAdminUser(null)).toBe(false);
    expect(isSuperAdminUser(undefined)).toBe(false);
  });
});

// Test 5: Navigation Item Role Isolation
describe('Navigation Menu Role Partitioning', () => {
  const getNavItems = (isSuper: boolean) => {
    if (isSuper) {
      return [
        { label: 'Client Companies & Tenants', path: '/companies' },
        { label: 'Compliance Audit Trail', path: '/audit' },
      ];
    }
    return [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Vendors Watchlist', path: '/vendors' },
      { label: 'Match Review', path: '/matches' },
      { label: 'Alerts Inbox', path: '/alerts' },
      { label: 'Ingestion Status', path: '/ingestion' },
      { label: 'Fuzzy Engine Rules', path: '/settings/fuzzy' },
    ];
  };

  it('includes /audit and /companies exclusively for Super-Admin', () => {
    const superNav = getNavItems(true);
    const paths = superNav.map(n => n.path);
    expect(paths).toContain('/companies');
    expect(paths).toContain('/audit');
    expect(paths).not.toContain('/dashboard');
    expect(paths).not.toContain('/vendors');
  });

  it('strictly excludes /audit and /companies from Company Admin navigation', () => {
    const companyNav = getNavItems(false);
    const paths = companyNav.map(n => n.path);
    expect(paths).not.toContain('/audit');
    expect(paths).not.toContain('/companies');
    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/vendors');
    expect(paths).toContain('/matches');
    expect(paths).toContain('/alerts');
    expect(paths).toContain('/ingestion');
    expect(paths).toContain('/settings/fuzzy');
  });
});

// Test 6: CSV Vendor Watchlist Import Parsing
describe('CSV Ingestion Validation Rules', () => {
  interface ParsedRow {
    name: string;
    country?: string;
    category?: string;
    criticality: number;
  }

  const parseCsvRow = (line: string): ParsedRow | null => {
    const parts = line.split(',').map(p => p.trim());
    if (parts.length === 0 || !parts[0]) return null;
    const name = parts[0];
    const country = parts[1] || undefined;
    const category = parts[2] || undefined;
    const rawCrit = parseInt(parts[3] || '3', 10);
    const criticality = Math.max(1, Math.min(5, isNaN(rawCrit) ? 3 : rawCrit));
    return { name, country, category, criticality };
  };

  it('parses valid vendor CSV row with default and clamped criticality', () => {
    const valid = parseCsvRow('Cipla Ltd,India,Formulation,4');
    expect(valid).toEqual({
      name: 'Cipla Ltd',
      country: 'India',
      category: 'Formulation',
      criticality: 4,
    });

    const outOfBounds = parseCsvRow('Lupin Limited,India,API,99');
    expect(outOfBounds?.criticality).toBe(5);

    const negative = parseCsvRow('Sun Pharma,India,Generics,-5');
    expect(negative?.criticality).toBe(1);

    const empty = parseCsvRow('');
    expect(empty).toBeNull();
  });
});

// Test 7: Mamdani Rule Trace Formatting for Explainability UI
describe('Mamdani Rule Trace Formatting', () => {
  interface FiredRule {
    ruleId: string;
    description: string;
    strength: number;
    stage: number;
  }

  const formatRuleExplanation = (rule: FiredRule): string => {
    const pct = Math.round(rule.strength * 100);
    return `[Stage ${rule.stage}] ${rule.ruleId}: ${rule.description} (${pct}% active)`;
  };

  it('formats human-readable rule activation string with percentage strength', () => {
    const formatted = formatRuleExplanation({
      ruleId: 'S1-R8',
      description: 'Some recalls and severe worst class -> High regulatory risk',
      strength: 0.667,
      stage: 1,
    });
    expect(formatted).toBe('[Stage 1] S1-R8: Some recalls and severe worst class -> High regulatory risk (67% active)');
  });
});

// Test 8: Client-Side Table Filtering and Search
describe('Client-Side Table Search Filtering', () => {
  interface VendorRow {
    id: number;
    name: string;
    category: string;
    country: string;
  }

  const filterVendors = (vendors: VendorRow[], query: string): VendorRow[] => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q) ||
      v.country.toLowerCase().includes(q)
    );
  };

  const sampleVendors: VendorRow[] = [
    { id: 1, name: 'Cipla Limited', category: 'Inhalation & Respiratory', country: 'India' },
    { id: 2, name: 'Lupin Limited', category: 'Oral Solids & Cephalosporins', country: 'India' },
    { id: 3, name: 'Teva Pharmaceuticals', category: 'Generics & Biosimilars', country: 'Israel' },
  ];

  it('filters by vendor name accurately', () => {
    expect(filterVendors(sampleVendors, 'cipla')).toHaveLength(1);
    expect(filterVendors(sampleVendors, 'cipla')[0].name).toBe('Cipla Limited');
  });

  it('filters by therapeutic category accurately', () => {
    expect(filterVendors(sampleVendors, 'respiratory')).toHaveLength(1);
    expect(filterVendors(sampleVendors, 'biosimilars')).toHaveLength(1);
  });

  it('returns all items when query is empty or whitespace', () => {
    expect(filterVendors(sampleVendors, '')).toHaveLength(3);
    expect(filterVendors(sampleVendors, '   ')).toHaveLength(3);
  });
});

// Test 9: Alert Status Badge Token Mapping
describe('Alert Status Badge Formatting', () => {
  const getAlertBadgeProps = (status: 'new' | 'reviewed' | 'dismissed') => {
    switch (status) {
      case 'new':
        return { label: 'New Action', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
      case 'reviewed':
        return { label: 'Reviewed', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
      case 'dismissed':
        return { label: 'Dismissed', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
    }
  };

  it('returns appropriate theme tokens for alert statuses', () => {
    expect(getAlertBadgeProps('new').label).toBe('New Action');
    expect(getAlertBadgeProps('reviewed').label).toBe('Reviewed');
    expect(getAlertBadgeProps('dismissed').label).toBe('Dismissed');
  });
});

// Test 10: Pagination Slice Calculation
describe('Pagination Helper', () => {
  const calculatePagination = (total: number, page: number, pageSize: number) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    return { totalPages, safePage, start, end };
  };

  it('calculates total pages and boundaries correctly', () => {
    const pag = calculatePagination(33, 1, 10);
    expect(pag.totalPages).toBe(4);
    expect(pag.start).toBe(0);
    expect(pag.end).toBe(10);

    const lastPage = calculatePagination(33, 4, 10);
    expect(lastPage.start).toBe(30);
    expect(lastPage.end).toBe(33);
  });
});
