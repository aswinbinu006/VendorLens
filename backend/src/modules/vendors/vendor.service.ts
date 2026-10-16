import { parse } from 'csv-parse/sync';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middleware/error.js';
import { auditService } from '../audit/audit.service.js';
import { normalizeName } from './normalize.js';
import { matchService } from '../matches/match.service.js';
import type {
  RiskLevel,
  MatchStatus,
  TrustLevel,
  SignalItem,
  ScoreDetail,
  ScoreHistoryItem,
  ScoreInputs,
  FiredRule,
  SignalType,
} from '../../types/index.js';

export interface CreateVendorDto {
  name: string;
  country?: string | null;
  category?: string | null;
  criticality?: number;
  notes?: string | null;
  aliases?: string[];
}

export interface UpdateVendorDto {
  name?: string;
  country?: string | null;
  category?: string | null;
  criticality?: number;
  notes?: string | null;
  aliases?: string[];
}

export interface ListVendorsParams {
  page?: number;
  pageSize?: number;
  level?: RiskLevel;
  q?: string;
  sortBy?: 'score' | 'name' | 'createdAt' | 'criticality';
  sortOrder?: 'asc' | 'desc';
}

export const vendorService = {
  /**
   * Checks for 409 collisions between a vendor's normalized name, its aliases,
   * and existing records in the database.
   */
  async checkCollisions(
    tx: any,
    normalizedName: string,
    aliases: string[] = [],
    excludeVendorId?: bigint
  ): Promise<{ normalizedAliases: Array<{ alias: string; normalizedAlias: string }> }> {
    const normalizedAliasMap = new Map<string, string>();

    // 1. Check duplicate aliases inside the request
    for (const rawAlias of aliases) {
      const normAlias = normalizeName(rawAlias);
      if (normAlias === normalizedName) {
        throw new AppError(
          409,
          'CONFLICT',
          `Alias "${rawAlias}" normalizes to the same value as the vendor name`
        );
      }
      if (normalizedAliasMap.has(normAlias)) {
        throw new AppError(
          409,
          'CONFLICT',
          `Duplicate alias "${rawAlias}" provided in request`
        );
      }
      normalizedAliasMap.set(normAlias, rawAlias);
    }

    const normAliasList = Array.from(normalizedAliasMap.keys());

    // 2. Check if normalized name collides with another vendor
    const existingVendorByName = await tx.vendor.findFirst({
      where: {
        normalizedName,
        ...(excludeVendorId ? { id: { not: excludeVendorId } } : {}),
      },
    });
    if (existingVendorByName) {
      throw new AppError(
        409,
        'CONFLICT',
        `A vendor with normalized name "${normalizedName}" already exists (ID: ${existingVendorByName.id})`
      );
    }

    // 3. Check if normalized name collides with an existing alias
    const existingAliasForName = await tx.vendorAlias.findFirst({
      where: {
        normalizedAlias: normalizedName,
        ...(excludeVendorId ? { vendorId: { not: excludeVendorId } } : {}),
      },
    });
    if (existingAliasForName) {
      throw new AppError(
        409,
        'CONFLICT',
        `A vendor alias with normalized name "${normalizedName}" already exists (Vendor ID: ${existingAliasForName.vendorId})`
      );
    }

    // 4. Check each alias against existing vendor names and aliases
    if (normAliasList.length > 0) {
      const collidingVendor = await tx.vendor.findFirst({
        where: {
          normalizedName: { in: normAliasList },
          ...(excludeVendorId ? { id: { not: excludeVendorId } } : {}),
        },
      });
      if (collidingVendor) {
        throw new AppError(
          409,
          'CONFLICT',
          `Alias collides with existing vendor "${collidingVendor.name}"`
        );
      }

      const collidingAlias = await tx.vendorAlias.findFirst({
        where: {
          normalizedAlias: { in: normAliasList },
          ...(excludeVendorId ? { vendorId: { not: excludeVendorId } } : {}),
        },
      });
      if (collidingAlias) {
        throw new AppError(
          409,
          'CONFLICT',
          `Alias "${collidingAlias.alias}" already exists for Vendor ID ${collidingAlias.vendorId}`
        );
      }
    }

    const formattedAliases = Array.from(normalizedAliasMap.entries()).map(([norm, raw]) => ({
      alias: raw,
      normalizedAlias: norm,
    }));

    return { normalizedAliases: formattedAliases };
  },

  async listVendors(params: ListVendorsParams) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.level) {
      where.currentLevel = params.level;
    }

    if (params.q && params.q.trim()) {
      // Case-insensitive parameterized search on name or normalizedName
      const searchTerm = params.q.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { normalizedName: { contains: searchTerm.toLowerCase() } },
        { aliases: { some: { alias: { contains: searchTerm, mode: 'insensitive' } } } },
      ];
    }

    let orderBy: any = { name: 'asc' };
    const sortDirection = params.sortOrder === 'desc' ? 'desc' : 'asc';

    if (params.sortBy === 'score') {
      orderBy = { currentScore: sortDirection };
    } else if (params.sortBy === 'createdAt') {
      orderBy = { createdAt: sortDirection };
    } else if (params.sortBy === 'criticality') {
      orderBy = { criticality: sortDirection };
    } else {
      orderBy = { name: sortDirection };
    }

    const [total, items] = await Promise.all([
      prisma.vendor.count({ where }),
      prisma.vendor.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          aliases: {
            select: { id: true, alias: true, normalizedAlias: true },
          },
        },
      }),
    ]);

    return {
      data: items.map((v) => ({
        id: Number(v.id),
        name: v.name,
        country: v.country,
        category: v.category,
        criticality: v.criticality,
        currentScore: v.currentScore,
        currentLevel: v.currentLevel,
        scoredAt: v.scoredAt ? v.scoredAt.toISOString() : null,
        notes: v.notes,
        createdAt: v.createdAt.toISOString(),
        aliases: v.aliases.map((a) => ({
          id: Number(a.id),
          alias: a.alias,
          normalizedAlias: a.normalizedAlias,
        })),
      })),
      page,
      pageSize,
      total,
    };
  },

  async getVendorById(id: bigint) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        aliases: {
          select: { id: true, alias: true, normalizedAlias: true },
        },
      },
    });

    if (!vendor) {
      throw new AppError(404, 'NOT_FOUND', `Vendor with ID ${id} not found`);
    }

    return {
      id: Number(vendor.id),
      name: vendor.name,
      country: vendor.country,
      category: vendor.category,
      criticality: vendor.criticality,
      currentScore: vendor.currentScore,
      currentLevel: vendor.currentLevel,
      scoredAt: vendor.scoredAt ? vendor.scoredAt.toISOString() : null,
      notes: vendor.notes,
      createdAt: vendor.createdAt.toISOString(),
      aliases: vendor.aliases.map((a) => ({
        id: Number(a.id),
        alias: a.alias,
        normalizedAlias: a.normalizedAlias,
      })),
    };
  },

  async createVendor(userId: bigint, dto: CreateVendorDto) {
    const normalizedName = normalizeName(dto.name);

    const result = await prisma.$transaction(async (tx) => {
      const { normalizedAliases } = await this.checkCollisions(
        tx,
        normalizedName,
        dto.aliases || []
      );

      const created = await tx.vendor.create({
        data: {
          name: dto.name.trim(),
          normalizedName,
          country: dto.country ? dto.country.trim() : null,
          category: dto.category ? dto.category.trim() : null,
          criticality: dto.criticality ?? 3,
          notes: dto.notes ? dto.notes.trim() : null,
          aliases: {
            create: normalizedAliases.map((a) => ({
              alias: a.alias,
              normalizedAlias: a.normalizedAlias,
            })),
          },
        },
        include: {
          aliases: {
            select: { id: true, alias: true, normalizedAlias: true },
          },
        },
      });

      // Audit log entry for CREATE_VENDOR
      await auditService.log({
        userId,
        action: 'CREATE_VENDOR',
        entity: 'vendor',
        entityId: created.id.toString(),
        details: {
          name: created.name,
          criticality: created.criticality,
          aliasCount: normalizedAliases.length,
        },
      });

      return {
        id: Number(created.id),
        name: created.name,
        country: created.country,
        category: created.category,
        criticality: created.criticality,
        currentScore: created.currentScore,
        currentLevel: created.currentLevel,
        scoredAt: created.scoredAt ? created.scoredAt.toISOString() : null,
        notes: created.notes,
        createdAt: created.createdAt.toISOString(),
        aliases: created.aliases.map((a) => ({
          id: Number(a.id),
          alias: a.alias,
          normalizedAlias: a.normalizedAlias,
        })),
      };
    });

    // Phase 4: Backfill matching against all stored signals and trigger rescore
    await matchService.backfillVendorMatches(BigInt(result.id));

    return result;
  },

  async updateVendor(userId: bigint, id: bigint, dto: UpdateVendorDto) {
    const changedFields: string[] = [];

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.vendor.findUnique({
        where: { id },
        include: { aliases: true },
      });
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', `Vendor with ID ${id} not found`);
      }

      let newNormalizedName = existing.normalizedName;

      if (dto.name !== undefined && dto.name.trim() !== existing.name) {
        newNormalizedName = normalizeName(dto.name);
        changedFields.push('name');
      }
      if (dto.country !== undefined && dto.country !== existing.country) changedFields.push('country');
      if (dto.category !== undefined && dto.category !== existing.category) changedFields.push('category');
      if (dto.criticality !== undefined && dto.criticality !== existing.criticality) changedFields.push('criticality');
      if (dto.notes !== undefined && dto.notes !== existing.notes) changedFields.push('notes');
      if (dto.aliases !== undefined) changedFields.push('aliases');

      let normalizedAliasesToCreate: Array<{ alias: string; normalizedAlias: string }> = [];
      if (dto.aliases !== undefined || dto.name !== undefined) {
        const aliasListToCheck = dto.aliases !== undefined ? dto.aliases : existing.aliases.map((a: any) => a.alias);
        const collisionResult = await this.checkCollisions(
          tx,
          newNormalizedName,
          aliasListToCheck,
          id
        );
        normalizedAliasesToCreate = collisionResult.normalizedAliases;
      }

      // Update vendor details
      const updateData: any = {};
      if (dto.name !== undefined) {
        updateData.name = dto.name.trim();
        updateData.normalizedName = newNormalizedName;
      }
      if (dto.country !== undefined) updateData.country = dto.country ? dto.country.trim() : null;
      if (dto.category !== undefined) updateData.category = dto.category ? dto.category.trim() : null;
      if (dto.criticality !== undefined) updateData.criticality = dto.criticality;
      if (dto.notes !== undefined) updateData.notes = dto.notes ? dto.notes.trim() : null;

      if (dto.aliases !== undefined) {
        // Atomic replacement: remove old aliases, insert new
        await tx.vendorAlias.deleteMany({ where: { vendorId: id } });
        updateData.aliases = {
          create: normalizedAliasesToCreate.map((a) => ({
            alias: a.alias,
            normalizedAlias: a.normalizedAlias,
          })),
        };
      }

      const updated = await tx.vendor.update({
        where: { id },
        data: updateData,
        include: {
          aliases: {
            select: { id: true, alias: true, normalizedAlias: true },
          },
        },
      });

      // Audit log entry recording changed fields only per requirement 3
      if (changedFields.length > 0) {
        await auditService.log({
          userId,
          action: 'UPDATE_VENDOR',
          entity: 'vendor',
          entityId: id.toString(),
          details: { changedFields },
        });
      }

      return {
        id: Number(updated.id),
        name: updated.name,
        country: updated.country,
        category: updated.category,
        criticality: updated.criticality,
        currentScore: updated.currentScore,
        currentLevel: updated.currentLevel,
        scoredAt: updated.scoredAt ? updated.scoredAt.toISOString() : null,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        aliases: updated.aliases.map((a) => ({
          id: Number(a.id),
          alias: a.alias,
          normalizedAlias: a.normalizedAlias,
        })),
      };
    });

    if (
      changedFields.includes('name') ||
      changedFields.includes('aliases') ||
      changedFields.includes('criticality')
    ) {
      await matchService.backfillVendorMatches(id);
    }

    return result;
  },

  async deleteVendor(userId: bigint, id: bigint) {
    const existing = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Vendor with ID ${id} not found`);
    }

    // Cascade delete is handled by database ON DELETE CASCADE
    await prisma.vendor.delete({
      where: { id },
    });

    // Audit log entry preserves the deleted vendor name per requirement 2
    await auditService.log({
      userId,
      action: 'DELETE_VENDOR',
      entity: 'vendor',
      entityId: id.toString(),
      details: { name: existing.name },
    });

    return { success: true };
  },

  /**
   * Imports vendors from CSV buffer in ONE transaction.
   * Invalid rows are skipped and reported with 1-based line numbers.
   */
  async importVendorsFromCsv(userId: bigint, fileBuffer: Buffer) {
    let records: any[];
    try {
      records = parse(fileBuffer, {
        columns: (header: string[]) => {
          // Normalize column headers to lowercase trimmed
          const lower = header.map((h) => h.trim().toLowerCase());
          const required = ['name', 'country', 'category', 'criticality'];
          // Reject if any required column is missing
          for (const req of required) {
            if (!lower.includes(req)) {
              throw new AppError(
                422,
                'VALIDATION_ERROR',
                `CSV header missing required column: "${req}"`
              );
            }
          }
          // Reject unknown columns
          for (const col of lower) {
            if (!required.includes(col)) {
              throw new AppError(
                422,
                'VALIDATION_ERROR',
                `CSV header contains unrecognized column: "${col}"`
              );
            }
          }
          return lower;
        },
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(422, 'VALIDATION_ERROR', `Failed to parse CSV: ${err.message}`);
    }

    if (records.length > 500) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        `CSV exceeds maximum limit of 500 data rows (found ${records.length} rows)`
      );
    }

    const errors: Array<{ line: number; message: string }> = [];
    const validRowsToInsert: Array<{
      name: string;
      normalizedName: string;
      country: string | null;
      category: string | null;
      criticality: number;
    }> = [];

    const seenNormalizedNamesInFile = new Map<string, number>();

    // Neutralize spreadsheet formula injection characters (= + - @) per docs/10
    const sanitizeText = (val?: string | null): string | null => {
      if (!val) return null;
      let text = String(val).trim();
      if (/^[=+\-@]/.test(text)) {
        text = text.replace(/^[=+\-@]+/, '');
      }
      return text.trim() || null;
    };

    // Process rows sequentially to track 1-based file line numbers (Header is line 1)
    for (let i = 0; i < records.length; i++) {
      const line = i + 2; // Line 1 is header
      const row = records[i];

      const rawName = sanitizeText(row.name);
      if (!rawName || rawName.length < 2 || rawName.length > 200) {
        errors.push({
          line,
          message: 'Vendor name must be between 2 and 200 characters',
        });
        continue;
      }

      let normalizedName: string;
      try {
        normalizedName = normalizeName(rawName);
      } catch (normErr: any) {
        errors.push({
          line,
          message: normErr?.message || 'Vendor name cannot be normalized',
        });
        continue;
      }

      // Check duplicates within the file itself
      if (seenNormalizedNamesInFile.has(normalizedName)) {
        const prevLine = seenNormalizedNamesInFile.get(normalizedName);
        errors.push({
          line,
          message: `Duplicate vendor in file: matches normalized name on line ${prevLine}`,
        });
        continue;
      }
      seenNormalizedNamesInFile.set(normalizedName, line);

      // Validate criticality (1..5)
      let criticality = 3;
      if (row.criticality !== undefined && row.criticality !== '') {
        const parsedCrit = parseInt(String(row.criticality).trim(), 10);
        if (isNaN(parsedCrit) || parsedCrit < 1 || parsedCrit > 5) {
          errors.push({
            line,
            message: 'Criticality must be an integer between 1 and 5',
          });
          continue;
        }
        criticality = parsedCrit;
      }

      const country = sanitizeText(row.country);
      if (country && country.length > 100) {
        errors.push({ line, message: 'Country must not exceed 100 characters' });
        continue;
      }

      const category = sanitizeText(row.category);
      if (category && category.length > 100) {
        errors.push({ line, message: 'Category must not exceed 100 characters' });
        continue;
      }

      validRowsToInsert.push({
        name: rawName,
        normalizedName,
        country,
        category,
        criticality,
      });
    }

    // Now execute single transaction: filter out any that collide with the DB, insert rest
    const result = await prisma.$transaction(async (tx) => {
      const finalToCreate: typeof validRowsToInsert = [];

      for (const row of validRowsToInsert) {
        const line = seenNormalizedNamesInFile.get(row.normalizedName)!;

        // Check if normalized name collides with DB vendor name or alias
        const existingVendor = await tx.vendor.findUnique({
          where: { normalizedName: row.normalizedName },
          select: { id: true },
        });

        if (existingVendor) {
          errors.push({
            line,
            message: `Vendor already exists in database (normalized: "${row.normalizedName}")`,
          });
          continue;
        }

        const existingAlias = await tx.vendorAlias.findFirst({
          where: { normalizedAlias: row.normalizedName },
          select: { id: true },
        });

        if (existingAlias) {
          errors.push({
            line,
            message: `Vendor name matches an existing alias in database`,
          });
          continue;
        }

        finalToCreate.push(row);
      }

      if (finalToCreate.length > 0) {
        await tx.vendor.createMany({
          data: finalToCreate,
        });
      }

      return {
        total: records.length,
        imported: finalToCreate.length,
        skipped: errors.length,
        errors: errors.sort((a, b) => a.line - b.line),
      };
    });

    // Write audit log entry (counts only per requirement 3)
    await auditService.log({
      userId,
      action: 'IMPORT_VENDORS',
      entity: 'vendor',
      details: {
        total: result.total,
        imported: result.imported,
        skipped: result.skipped,
      },
    });

    if (result.imported > 0) {
      const inserted = await prisma.vendor.findMany({
        where: {
          normalizedName: { in: validRowsToInsert.map((r) => r.normalizedName) },
        },
        select: { id: true },
      });
      for (const v of inserted) {
        await matchService.backfillVendorMatches(v.id);
      }
    }

    return result;
  },

  /**
   * Phase 8: Get signals matched to a vendor
   */
  async getVendorSignals(
    vendorId: bigint,
    params: { page?: number; pageSize?: number; trust?: TrustLevel; matchStatus?: MatchStatus } = {},
  ) {
    const existing = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Vendor with ID ${vendorId} not found`);
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: any = {
      vendorId,
    };
    if (params.matchStatus) {
      where.status = params.matchStatus;
    }
    if (params.trust) {
      where.signal = { trust: params.trust };
    }

    const [matches, total] = await Promise.all([
      prisma.signalMatch.findMany({
        where,
        orderBy: { signal: { eventDate: 'desc' } },
        skip,
        take: pageSize,
        include: { signal: true },
      }),
      prisma.signalMatch.count({ where }),
    ]);

    const data: SignalItem[] = matches.map((m) => ({
      id: Number(m.signal.id),
      type: m.signal.signalType as SignalType,
      trust: m.signal.trust as TrustLevel,
      title: m.signal.title,
      summary: m.signal.summary,
      severityRaw: m.signal.severityRaw,
      severityNum: m.signal.severityNum,
      eventDate: m.signal.eventDate ? m.signal.eventDate.toISOString() : null,
      reportDate: m.signal.reportDate ? m.signal.reportDate.toISOString() : null,
      country: m.signal.country,
      eventId: m.signal.eventId,
      url: m.signal.url,
      sourceDomain: m.signal.sourceDomain,
      matchStatus: m.status as MatchStatus,
      firmName: m.signal.firmName,
    }));

    return {
      data,
      page,
      pageSize,
      total,
    };
  },

  /**
   * Phase 8: Get latest risk score details with fired rules and inputs
   */
  async getVendorLatestScore(vendorId: bigint): Promise<ScoreDetail> {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });
    if (!vendor) {
      throw new AppError(404, 'NOT_FOUND', `Vendor with ID ${vendorId} not found`);
    }

    const score = await prisma.riskScore.findFirst({
      where: { vendorId },
      orderBy: { computedAt: 'desc' },
    });

    if (!score) {
      throw new AppError(404, 'NOT_FOUND', `Vendor with ID ${vendorId} has not been scored yet`);
    }

    return {
      vendorId: Number(score.vendorId),
      score: score.score,
      level: score.level as RiskLevel,
      configVersion: score.configVersion,
      inputs: score.inputs as unknown as ScoreInputs,
      firedRules: (score.firedRules as unknown as FiredRule[]) || [],
      computedAt: score.computedAt.toISOString(),
    };
  },

  /**
   * Phase 8: Get score evaluation history for vendor
   */
  async getVendorScoreHistory(
    vendorId: bigint,
    params: { page?: number; pageSize?: number } = {},
  ) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });
    if (!vendor) {
      throw new AppError(404, 'NOT_FOUND', `Vendor with ID ${vendorId} not found`);
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const [scores, total] = await Promise.all([
      prisma.riskScore.findMany({
        where: { vendorId },
        orderBy: { computedAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          score: true,
          level: true,
          configVersion: true,
          computedAt: true,
        },
      }),
      prisma.riskScore.count({ where: { vendorId } }),
    ]);

    const data: ScoreHistoryItem[] = scores.map((s) => ({
      id: Number(s.id),
      score: s.score,
      level: s.level as RiskLevel,
      configVersion: s.configVersion,
      computedAt: s.computedAt.toISOString(),
    }));

    return {
      data,
      page,
      pageSize,
      total,
    };
  },
};
