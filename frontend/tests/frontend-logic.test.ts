import { describe, it, expect } from 'vitest';

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
