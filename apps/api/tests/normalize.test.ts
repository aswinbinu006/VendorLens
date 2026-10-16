import { describe, it, expect } from 'vitest';
import { normalizeName } from '../src/modules/vendors/normalize.js';
import { AppError } from '../src/middleware/error.js';

describe('Vendor Name Normalization (pure function, docs/08)', () => {
  const tableDrivenCases: Array<{ input: string; expected: string; note: string }> = [
    // Real firm names from Phase 0 openFDA enforcement verification
    {
      input: 'Sun Pharmaceutical Industries, Inc.',
      expected: 'sun pharmaceutical industries',
      note: 'Phase 0 real record: strips comma and trailing Inc.',
    },
    {
      input: 'SUN PHARMACEUTICAL INDUSTRIES INC',
      expected: 'sun pharmaceutical industries',
      note: 'Phase 0 real record: uppercase collapsed to lowercase',
    },
    {
      input: 'Novartis Consumer Health',
      expected: 'novartis consumer health',
      note: 'Phase 0 real record: discriminating words preserved',
    },
    {
      input: 'Novartis Pharmaceuticals Corp.',
      expected: 'novartis pharmaceuticals',
      note: 'Phase 0 real record: strips Corp. preserving pharmaceuticals',
    },
    {
      input: 'Aurobindo Pharma USA Inc.',
      expected: 'aurobindo pharma usa',
      note: 'Phase 0 real record: preserves USA, strips Inc.',
    },
    {
      input: 'Aurobindo Pharma LTD',
      expected: 'aurobindo pharma',
      note: 'Phase 0 real record: uppercase LTD stripped',
    },
    {
      input: 'Pfizer Inc.',
      expected: 'pfizer',
      note: 'Phase 0 real record: strips Inc.',
    },
    {
      input: 'Taro Pharmaceuticals U.S.A., Inc.',
      expected: 'taro pharmaceuticals u s a',
      note: 'Phase 0 real record: periods removed, trailing Inc stripped',
    },
    {
      input: 'Johnson & Johnson Pharmaceutical Services, LLC',
      expected: 'johnson and johnson pharmaceutical services',
      note: '& replaced with and, LLC stripped',
    },
    {
      input: 'Dr. Reddy\'s Laboratories Ltd.',
      expected: 'dr reddys laboratories',
      note: 'E19: Apostrophe deleted, dot removed, Ltd stripped, laboratories preserved',
    },
    {
      input: 'Dr Reddys Laboratories',
      expected: 'dr reddys laboratories',
      note: 'E19: Matches Dr. Reddys Laboratories exactly',
    },
    {
      input: 'Hetero Drugs Pvt. Ltd.',
      expected: 'hetero drugs',
      note: 'Compound suffix Pvt. Ltd. stripped',
    },
    {
      input: 'Divi\'s Laboratories Private Limited',
      expected: 'divis laboratories',
      note: 'E19: Apostrophe deleted, compound suffix Private Limited stripped',
    },
    {
      input: 'Divis Laboratories',
      expected: 'divis laboratories',
      note: 'E19: Matches Divis Laboratories without apostrophe',
    },
    {
      input: 'Cipla Limited',
      expected: 'cipla',
      note: 'Limited stripped',
    },
    {
      input: 'Boehringer Ingelheim Pharma GmbH & Co. KG',
      expected: 'boehringer ingelheim pharma',
      note: 'Compound German suffix GmbH & Co. KG stripped, pharma preserved',
    },
    {
      input: 'AstraZeneca PLC',
      expected: 'astrazeneca',
      note: 'PLC stripped',
    },
    {
      input: 'Sanofi-Aventis S.A.',
      expected: 'sanofi aventis',
      note: 'Hyphen removed, S.A. stripped',
    },
    {
      input: 'GlaxoSmithKline LLC',
      expected: 'glaxosmithkline',
      note: 'LLC stripped',
    },
    {
      input: 'Fresenius Kabi AG',
      expected: 'fresenius kabi',
      note: 'AG stripped',
    },
    {
      input: 'Biocon Biologics India Pvt Ltd',
      expected: 'biocon biologics india',
      note: 'Pvt Ltd stripped',
    },
    {
      input: 'Torrent Pharmaceuticals Co., Ltd.',
      expected: 'torrent pharmaceuticals',
      note: 'Co., Ltd. compound suffix stripped',
    },
    {
      input: 'Hikma Pharmaceuticals PLC',
      expected: 'hikma pharmaceuticals',
      note: 'PLC stripped, pharmaceuticals kept',
    },
    {
      input: 'Teva Pharmaceutical Industries Ltd.',
      expected: 'teva pharmaceutical industries',
      note: 'Ltd. stripped, industries kept',
    },
    {
      input: 'Laboratoires Théa S.A.S.',
      expected: 'laboratoires thea',
      note: 'Diacritics stripped via NFKD, SAS stripped, laboratoires kept',
    },
    {
      input: 'Mylan Healthcare B.V.',
      expected: 'mylan healthcare',
      note: 'Dutch B.V. suffix stripped, healthcare kept',
    },
    {
      input: 'Kyowa Kirin Co., Ltd.',
      expected: 'kyowa kirin',
      note: 'Co., Ltd. stripped',
    },
    {
      input: '  Accord Healthcare   Incorporated   ',
      expected: 'accord healthcare',
      note: 'Leading/trailing and internal spaces collapsed, Incorporated stripped',
    },
  ];

  tableDrivenCases.forEach(({ input, expected, note }, index) => {
    it(`Case ${index + 1}: ${note} ("${input}" -> "${expected}")`, () => {
      expect(normalizeName(input)).toBe(expected);
    });
  });

  it('rejects empty strings or strings with only whitespace with 422 VALIDATION_ERROR', () => {
    expect(() => normalizeName('')).toThrow(AppError);
    expect(() => normalizeName('   ')).toThrow(AppError);
  });

  it('rejects names that consist solely of punctuation or symbols with 422 VALIDATION_ERROR', () => {
    expect(() => normalizeName('... ,,, ---')).toThrow(AppError);
    expect(() => normalizeName('& & &')).toThrow(AppError);
  });

  it('rejects names that contain only legal suffixes (nothing discriminating remains) with 422 VALIDATION_ERROR', () => {
    try {
      normalizeName('Inc.');
      expect.fail('Should have thrown AppError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(422);
      expect(err.code).toBe('VALIDATION_ERROR');
    }

    expect(() => normalizeName('Pvt. Ltd.')).toThrow(AppError);
    expect(() => normalizeName('LLC, Corp')).toThrow(AppError);
  });
});
