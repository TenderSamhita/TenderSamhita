/**
 * Evidence traceability & citation manager
 */

export const evidenceService = {
  /**
   * Format a full citation string for procurement documentation
   */
  formatCitation({ isNumber, section, page, clause, table, figure }) {
    const parts = [isNumber];
    if (section) parts.push(`Sec. ${section}`);
    if (clause) parts.push(`Cl. ${clause}`);
    if (table) parts.push(table);
    if (figure) parts.push(figure);
    if (page) parts.push(`p. ${page}`);
    return parts.join(', ');
  },

  /**
   * Build deep link for source page viewer
   */
  buildDeepLink(standardId, page = 1) {
    return `#/standards/${encodeURIComponent(standardId)}?page=${page}`;
  }
};
