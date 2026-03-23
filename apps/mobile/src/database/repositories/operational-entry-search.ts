export function buildOperationalEntrySearch(search?: string | null) {
  const normalized = search?.trim().toLowerCase() ?? '';

  if (!normalized) {
    return {
      value: null,
      pattern: null,
    };
  }

  return {
    value: normalized,
    pattern: `%${normalized}%`,
  };
}
