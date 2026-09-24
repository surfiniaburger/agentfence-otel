export const TRUST = {
  TRUSTED: "TRUSTED",
  UNTRUSTED: "UNTRUSTED",
  TAINTED: "TAINTED",
};

function createChainId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `af-chain-${Date.now().toString(36)}`;
}

function appendUnique(items, value) {
  return items.includes(value) ? items : [...items, value];
}

/**
 * Provenance remains intentionally small and serializable because it is also
 * carried through WebMCP tool results. The legacy fields (trust/sources/path/
 * reason) are preserved so the existing demo and policy code remain compatible.
 *
 * lineage is an immutable, append-only record of how information reached the
 * current action context. It contains metadata only; raw repository content,
 * prompts, and patch bodies do not belong here.
 */
function initialLineage() {
  const chainId = createChainId();
  return {
    chainId,
    rootIds: [],
    artifacts: [],
    transformations: [],
  };
}

export function initialProvenance() {
  return {
    trust: TRUST.TRUSTED,
    sources: [],
    path: [],
    reason: "No untrusted content has influenced the current action path.",
    lineage: initialLineage(),
  };
}

function ensureLineage(provenance) {
  return provenance?.lineage || initialLineage();
}

function appendArtifact(lineage, artifact) {
  return {
    ...lineage,
    artifacts: [...lineage.artifacts, artifact],
  };
}

function appendTransformation(lineage, transformation) {
  return {
    ...lineage,
    transformations: [...lineage.transformations, transformation],
  };
}

/**
 * Records an information source without storing the source content itself.
 * Existing callers only need the returned provenance object.
 */
export function markUntrusted(provenance, source, reason) {
  const sources = appendUnique(provenance.sources || [], source);
  const previousLineage = ensureLineage(provenance);
  const artifactId = `source-${previousLineage.artifacts.length + 1}`;
  const lineage = appendArtifact(
    previousLineage,
    {
      id: artifactId,
      type: "source",
      source,
      trust: TRUST.UNTRUSTED,
      parentIds: [],
      hopCount: 0,
    }
  );

  return {
    ...provenance,
    trust: TRUST.UNTRUSTED,
    sources,
    path: [...(provenance.path || []), source],
    reason,
    lineage: {
      ...lineage,
      rootIds: appendUnique(lineage.rootIds, artifactId),
    },
  };
}

/**
 * Preserves the existing workflow's trust semantics while explicitly recording
 * that a derived artifact inherited the provenance of its parent context.
 *
 * This is the primitive used later for tool, LLM, and multi-hop transformations.
 * A transformation can change the representation, but cannot clear taint.
 */
export function deriveProvenance(provenance, operation, options = {}) {
  const currentLineage = ensureLineage(provenance);
  const parentIds = options.parentIds?.length
    ? [...options.parentIds]
    : currentLineage.artifacts.length
      ? [currentLineage.artifacts[currentLineage.artifacts.length - 1].id]
      : [];

  const inheritedTrust = provenance.trust === TRUST.TRUSTED
    ? TRUST.TRUSTED
    : TRUST.TAINTED;

  const artifactId = options.artifactId || `artifact-${currentLineage.artifacts.length + 1}`;
  const artifact = {
    id: artifactId,
    type: options.type || "derived",
    operation,
    parentIds,
    trust: inheritedTrust,
    hopCount: Math.max(
      0,
      ...parentIds.map((parentId) => {
        const parent = currentLineage.artifacts.find((item) => item.id === parentId);
        return parent ? parent.hopCount + 1 : 0;
      })
    ),
  };

  const nextLineage = appendTransformation(
    appendArtifact(currentLineage, artifact),
    {
      operation,
      inputIds: parentIds,
      outputId: artifactId,
      type: options.type || "derived",
    }
  );

  return {
    ...provenance,
    trust: inheritedTrust,
    lineage: nextLineage,
    path: [...(provenance.path || []), operation],
    reason: inheritedTrust === TRUST.TRUSTED
      ? provenance.reason
      : `Action context inherits untrusted provenance from ${(provenance.sources || []).join(", ")}.`,
  };
}

export function propagateTaint(provenance, operation) {
  return deriveProvenance(provenance, operation, { type: "action_context" });
}

/**
 * Safe-to-export telemetry summary. Deliberately excludes raw content.
 */
export function provenanceSummary(provenance) {
  const lineage = ensureLineage(provenance);
  return {
    chainId: lineage.chainId,
    trust: provenance.trust,
    tainted: provenance.trust === TRUST.TAINTED || provenance.trust === TRUST.UNTRUSTED,
    rootSourceCount: (provenance.sources || []).length,
    hopCount: lineage.artifacts.reduce((max, item) => Math.max(max, item.hopCount || 0), 0),
    transformationCount: lineage.transformations.length,
    artifactCount: lineage.artifacts.length,
    inherited: lineage.transformations.length > 0 && provenance.trust !== TRUST.TRUSTED,
  };
}
