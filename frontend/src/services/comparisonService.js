import { request } from './apiClient';

export const comparisonService = {
  /**
   * Run comparison matrix between tender requirements and standard specifications.
   * Calls POST /api/compare
   */
  async compareTenderWithStandard(tenderText, standardId) {
    if (!tenderText || !standardId) {
      throw new Error('Both tender text and standard ID are required for comparison');
    }

    const data = await request('/api/compare', {
      method: 'POST',
      body: JSON.stringify({
        tender_text: tenderText,
        standard_id: standardId
      })
    });

    return {
      standard_id: data.standard_id,
      is_number: data.is_number,
      tender_requirements: data.tender_requirements || {},
      note: data.note || 'Mismatches are POTENTIAL and require procurement officer review — system does not decide compliance.',
      comparison: (data.comparison || []).map(row => {
        // Normalize status strictly to specifications
        let status = row.status || 'REQUIRES_REVIEW';
        let tenderVal = row.tender;
        let standardVal = row.standard;
        let reviewNote = row.note || '';

        if (!tenderVal || tenderVal.toLowerCase().includes('not specified')) {
          tenderVal = 'Not specified in tender';
          status = 'TENDER_NOT_SPECIFIED';
          reviewNote = 'Standard requirement available for review.';
        }

        return {
          requirement: row.requirement,
          tender: tenderVal,
          standard: standardVal,
          evidence: row.evidence || 'No direct clause evidence',
          source_page: row.evidence ? extractPageFromEvidence(row.evidence) : null,
          status: status,
          note: reviewNote
        };
      })
    };
  }
};

function extractPageFromEvidence(evidenceStr) {
  const match = evidenceStr.match(/p\.(\d+)|page\s*(\d+)/i);
  return match ? parseInt(match[1] || match[2], 10) : null;
}
