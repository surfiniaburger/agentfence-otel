export const TRUST = {
  TRUSTED: "TRUSTED",
  UNTRUSTED: "UNTRUSTED",
  TAINTED: "TAINTED",
};

export function initialProvenance() {
  return {
    trust: TRUST.TRUSTED,
    sources: [],
    path: [],
    reason: "No untrusted content has influenced the current action path.",
  };
}

export function markUntrusted(provenance, source, reason) {
  const sources = provenance.sources.includes(source)
    ? provenance.sources
    : [...provenance.sources, source];
  return {
    trust: TRUST.UNTRUSTED,
    sources,
    path: [...provenance.path, source],
    reason,
  };
}

export function propagateTaint(provenance, operation) {
  if (provenance.trust === TRUST.TRUSTED) return provenance;
  return {
    ...provenance,
    trust: TRUST.TAINTED,
    path: [...provenance.path, operation],
    reason: `Action context inherits untrusted provenance from ${provenance.sources.join(", ")}.`,
  };
}
