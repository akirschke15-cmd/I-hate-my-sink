import type { Sink, Measurement } from '@ihms/db/schema';

export type InstallMethod = 'bowl_swap' | 'cut_and_polish' | 'top_mount' | 'apron_front';
export type FitRating = 'excellent' | 'good' | 'marginal' | 'no_go';

export interface MatchPreferences {
  colorPreference?: string;
  bowlConfiguration?: string;
  installationType?: string;
  maxPrice?: number;
  preferWorkstation?: boolean;
}

export interface InstallMethodResult {
  method: InstallMethod;
  feasible: boolean;
  reason: string;
}

export interface MatchResult {
  sink: Sink;
  overallScore: number;
  fitRating: FitRating;
  feasibleInstallMethods: InstallMethodResult[];
  eliminatedInstallMethods: InstallMethodResult[];
  hardGateFailures: string[];
  warnings: string[];
  addOnServices: string[];
  dimensionalFit: {
    widthClearance: number;
    depthClearance: number;
    heightClearance: number;
  };
  reasons: string[]; // backward compat with old interface
}

/**
 * Hard gates that auto-eliminate sinks from consideration.
 * These are physical/structural constraints that cannot be overcome.
 */
function evaluateHardGates(sink: Sink, measurement: Measurement): string[] {
  const failures: string[] = [];

  const cabinetWidth = parseFloat(measurement.cabinetWidthInches);
  const sinkWidth = parseFloat(sink.widthInches);

  // GATE 1: Minimum cabinet width (use IHMS field-tested if available, else manufacturer)
  const minCab = sink.ihmsMinCabinetWidthInches
    ? parseFloat(sink.ihmsMinCabinetWidthInches)
    : sink.mfgMinCabinetWidthInches
      ? parseFloat(sink.mfgMinCabinetWidthInches)
      : null;

  if (minCab && minCab > cabinetWidth) {
    failures.push(`Cabinet too narrow: ${cabinetWidth}" < required ${minCab}" minimum`);
  }

  // GATE 2: Cast iron removal + tight cabinet = NO GO
  if (measurement.existingSinkMaterial === 'cast_iron' && cabinetWidth < 30) {
    failures.push('Cast iron removal in cabinet under 30" is not feasible');
  }

  // GATE 3: Sink physically too wide for cabinet
  if (sinkWidth > cabinetWidth) {
    failures.push(`Sink width ${sinkWidth}" exceeds cabinet width ${cabinetWidth}"`);
  }

  return failures;
}

/**
 * Evaluate which installation methods are feasible for a given sink/measurement combo.
 * Returns both feasible and eliminated methods with reasoning.
 */
function evaluateInstallMethods(
  sink: Sink,
  measurement: Measurement
): { feasible: InstallMethodResult[]; eliminated: InstallMethodResult[] } {
  const results: InstallMethodResult[] = [];

  const cabinetWidth = parseFloat(measurement.cabinetWidthInches);
  const sinkWidth = parseFloat(sink.widthInches);
  const countertopThickness = measurement.countertopThicknessInches
    ? parseFloat(measurement.countertopThicknessInches)
    : null;
  const cabinetIntegrity = measurement.cabinetIntegrity;
  const existingCutoutWidth = measurement.existingCutoutWidthInches
    ? parseFloat(measurement.existingCutoutWidthInches)
    : null;
  const existingCutoutDepth = measurement.existingCutoutDepthInches
    ? parseFloat(measurement.existingCutoutDepthInches)
    : null;
  const sinkDepth = parseFloat(sink.depthInches);

  // BOWL SWAP
  const bowlSwap: InstallMethodResult = {
    method: 'bowl_swap',
    feasible: true,
    reason: '',
  };
  if (!existingCutoutWidth || !existingCutoutDepth) {
    bowlSwap.feasible = false;
    bowlSwap.reason = 'No existing cutout dimensions provided';
  } else if (
    Math.abs(existingCutoutWidth - sinkWidth) > 1 ||
    Math.abs(existingCutoutDepth - sinkDepth) > 1
  ) {
    bowlSwap.feasible = false;
    bowlSwap.reason = `Cutout (${existingCutoutWidth}"x${existingCutoutDepth}") doesn't match sink (${sinkWidth}"x${sinkDepth}")`;
  } else if (cabinetIntegrity === 'compromised') {
    bowlSwap.feasible = false;
    bowlSwap.reason = 'Cabinet integrity is compromised';
  } else {
    bowlSwap.reason = 'Existing cutout matches sink dimensions';
  }
  results.push(bowlSwap);

  // CUT & POLISH
  const cutPolish: InstallMethodResult = {
    method: 'cut_and_polish',
    feasible: true,
    reason: '',
  };
  if (countertopThickness && countertopThickness > 2.25) {
    cutPolish.feasible = false;
    cutPolish.reason = `Countertop too thick (${countertopThickness}") for blade - max 2.25"`;
  } else if (sinkWidth > cabinetWidth - 2) {
    cutPolish.feasible = false;
    cutPolish.reason = 'Insufficient width clearance for cut & polish';
  } else {
    cutPolish.reason = 'Countertop thickness and width clearance allow cut & polish';
  }
  results.push(cutPolish);

  // TOP MOUNT
  const topMount: InstallMethodResult = {
    method: 'top_mount',
    feasible: true,
    reason: '',
  };
  if (sink.mountingStyle !== 'drop_in' && sink.installationType !== 'top_mount') {
    topMount.feasible = false;
    topMount.reason = 'Sink does not support top mount installation';
  } else if (sinkWidth > cabinetWidth) {
    topMount.feasible = false;
    topMount.reason = 'Sink too wide for cabinet opening';
  } else {
    topMount.reason = 'Top mount installation compatible';
  }
  results.push(topMount);

  // APRON FRONT
  const apronFront: InstallMethodResult = {
    method: 'apron_front',
    feasible: true,
    reason: '',
  };
  if (!sink.apronDepthInches && sink.installationType !== 'farmhouse_apron') {
    apronFront.feasible = false;
    apronFront.reason = 'Sink is not an apron front model';
  } else if (cabinetWidth < 30) {
    apronFront.feasible = false;
    apronFront.reason = 'Cabinet too narrow for apron front installation';
  } else {
    apronFront.reason = 'Apron front installation compatible';
  }
  results.push(apronFront);

  return {
    feasible: results.filter((r) => r.feasible),
    eliminated: results.filter((r) => !r.feasible),
  };
}

/**
 * Calculate soft score for sinks that pass hard gates.
 * Evaluates fit quality, preferences, and identifies warnings/add-on services.
 */
function calculateSoftScore(
  sink: Sink,
  measurement: Measurement,
  installMethods: InstallMethodResult[],
  preferences?: MatchPreferences
): { score: number; reasons: string[]; warnings: string[]; addOnServices: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const addOnServices: string[] = [];

  const sinkWidth = parseFloat(sink.widthInches);
  const sinkDepth = parseFloat(sink.depthInches);
  const cabinetWidth = parseFloat(measurement.cabinetWidthInches);
  const cabinetDepth = parseFloat(measurement.cabinetDepthInches);

  // Width fit (max 25 points)
  const widthClearance = cabinetWidth - sinkWidth;
  if (widthClearance >= 6) {
    score += 25;
    reasons.push('Excellent width clearance');
  } else if (widthClearance >= 3) {
    score += 20;
    reasons.push('Good width clearance');
  } else if (widthClearance >= 1) {
    score += 12;
    reasons.push('Tight width fit');
  } else {
    score += 5;
    reasons.push('Very tight width fit');
  }

  // Depth fit (max 20 points)
  const depthClearance = cabinetDepth - sinkDepth;
  if (depthClearance >= 4) {
    score += 20;
    reasons.push('Excellent depth clearance');
  } else if (depthClearance >= 2) {
    score += 15;
    reasons.push('Good depth clearance');
  } else if (depthClearance >= 0) {
    score += 8;
    reasons.push('Tight depth fit');
  } else {
    score += 0;
    warnings.push('Sink deeper than cabinet - verify fit');
  }

  // Mounting style match (max 15 points)
  if (measurement.mountingStyle) {
    const styleMap: Record<string, string[]> = {
      undermount: ['undermount'],
      drop_in: ['drop_in'],
      farmhouse: ['farmhouse'],
      flush_mount: ['flush_mount'],
    };
    const compatibleStyles = styleMap[measurement.mountingStyle] || [];
    if (compatibleStyles.includes(sink.mountingStyle)) {
      score += 15;
      reasons.push('Matches preferred mounting style');
    } else {
      score += 5;
      reasons.push(`Different mounting style (${sink.mountingStyle})`);
    }
  } else {
    score += 10;
  }

  // Bowl configuration match (max 10 points)
  if (preferences?.bowlConfiguration && sink.bowlConfiguration) {
    if (sink.bowlConfiguration === preferences.bowlConfiguration) {
      score += 10;
      reasons.push('Matches preferred bowl configuration');
    } else {
      score += 3;
    }
  } else if (measurement.existingSinkBowlCount) {
    const existingCount = measurement.existingSinkBowlCount;
    if (sink.bowlCount === existingCount) {
      score += 10;
      reasons.push(`Matches existing bowl count (${existingCount})`);
    } else {
      score += 4;
    }
  } else {
    score += 7;
  }

  // Number of feasible install methods (max 10 points)
  const feasibleCount = installMethods.filter((m) => m.feasible).length;
  score += Math.min(feasibleCount * 3, 10);
  if (feasibleCount >= 3) {
    reasons.push('Multiple installation methods available');
  } else if (feasibleCount === 1) {
    warnings.push('Only one installation method available');
  }

  // Color preference (max 5 points)
  if (preferences?.colorPreference && sink.availableColors) {
    const colors = sink.availableColors as { code: string; name: string }[];
    if (
      colors.some(
        (c) =>
          c.name.toLowerCase().includes(preferences.colorPreference!.toLowerCase()) ||
          c.code.toLowerCase() === preferences.colorPreference!.toLowerCase()
      )
    ) {
      score += 5;
      reasons.push('Preferred color available');
    }
  } else {
    score += 3;
  }

  // Workstation preference (max 5 points)
  if (preferences?.preferWorkstation && sink.isWorkstation) {
    score += 5;
    reasons.push('Workstation features included');
  }

  // Price range (max 5 points)
  if (preferences?.maxPrice) {
    const price = parseFloat(sink.basePrice);
    if (price <= preferences.maxPrice) {
      score += 5;
      reasons.push('Within budget');
    } else {
      warnings.push(`Over budget by $${(price - preferences.maxPrice).toFixed(0)}`);
    }
  } else {
    score += 3;
  }

  // Installation type match (max 5 points)
  if (preferences?.installationType && sink.installationType) {
    if (sink.installationType === preferences.installationType) {
      score += 5;
      reasons.push('Matches preferred installation type');
    } else {
      score += 2;
    }
  } else {
    score += 3;
  }

  // Cast iron removal warning and add-on
  if (measurement.existingSinkMaterial === 'cast_iron') {
    warnings.push('Cast iron removal required - additional labor');
    addOnServices.push('Cast iron sink removal ($350-650)');
  }

  // Cabinet integrity warnings
  if (measurement.cabinetIntegrity === 'questionable') {
    warnings.push('Cabinet integrity questionable - may need reinforcement');
    addOnServices.push('Cabinet reinforcement ($150-300)');
  } else if (measurement.cabinetIntegrity === 'compromised') {
    warnings.push('Cabinet floor replacement required');
    addOnServices.push('Cabinet floor replacement ($450-650)');
  }

  // RO system clearance
  if (measurement.roSystemPresent) {
    warnings.push('RO system present - verify under-sink clearance');
  }

  return { score, reasons, warnings, addOnServices };
}

/**
 * Main matching function: scores and ranks sinks against a measurement.
 *
 * Three-step process:
 * 1. Hard gates (eliminate physically incompatible sinks)
 * 2. Install method feasibility (what methods work for this sink/cabinet combo)
 * 3. Soft scoring (fit quality, preferences, warnings)
 *
 * Returns both feasible matches (sorted by score) and no-go matches (for transparency).
 */
export function matchSinksToMeasurement(
  candidateSinks: Sink[],
  measurement: Measurement,
  preferences?: MatchPreferences,
  limit: number = 10
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const sink of candidateSinks) {
    // Step 1: Hard Gates
    const hardGateFailures = evaluateHardGates(sink, measurement);

    // Step 2: Install Method Feasibility (even for eliminated sinks, for transparency)
    const { feasible, eliminated } = evaluateInstallMethods(sink, measurement);

    // Step 3: Soft Score (only for sinks that pass hard gates)
    if (hardGateFailures.length === 0) {
      const { score, reasons, warnings, addOnServices } = calculateSoftScore(
        sink,
        measurement,
        [...feasible, ...eliminated],
        preferences
      );

      const cabinetWidth = parseFloat(measurement.cabinetWidthInches);
      const cabinetDepth = parseFloat(measurement.cabinetDepthInches);
      const cabinetHeight = parseFloat(measurement.cabinetHeightInches);

      let fitRating: FitRating;
      if (score >= 80) fitRating = 'excellent';
      else if (score >= 55) fitRating = 'good';
      else if (score >= 30) fitRating = 'marginal';
      else fitRating = 'no_go';

      // If no feasible install methods, downgrade to no_go
      if (feasible.length === 0) {
        fitRating = 'no_go';
        warnings.push('No feasible installation method found');
      }

      results.push({
        sink,
        overallScore: score,
        fitRating,
        feasibleInstallMethods: feasible,
        eliminatedInstallMethods: eliminated,
        hardGateFailures: [],
        warnings,
        addOnServices,
        dimensionalFit: {
          widthClearance: cabinetWidth - parseFloat(sink.widthInches),
          depthClearance: cabinetDepth - parseFloat(sink.depthInches),
          heightClearance: cabinetHeight - parseFloat(sink.heightInches),
        },
        reasons,
      });
    } else {
      // Still include hard-gated sinks as no_go for transparency
      results.push({
        sink,
        overallScore: 0,
        fitRating: 'no_go',
        feasibleInstallMethods: [],
        eliminatedInstallMethods: eliminated,
        hardGateFailures,
        warnings: [],
        addOnServices: [],
        dimensionalFit: {
          widthClearance:
            parseFloat(measurement.cabinetWidthInches) - parseFloat(sink.widthInches),
          depthClearance:
            parseFloat(measurement.cabinetDepthInches) - parseFloat(sink.depthInches),
          heightClearance:
            parseFloat(measurement.cabinetHeightInches) - parseFloat(sink.heightInches),
        },
        reasons: hardGateFailures,
      });
    }
  }

  // Sort: feasible matches by score (desc), then no_go at end
  results.sort((a, b) => {
    if (a.fitRating === 'no_go' && b.fitRating !== 'no_go') return 1;
    if (a.fitRating !== 'no_go' && b.fitRating === 'no_go') return -1;
    return b.overallScore - a.overallScore;
  });

  return results.slice(0, limit);
}
