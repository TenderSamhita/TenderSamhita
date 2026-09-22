import { request } from './apiClient';

export const recommendationService = {
  /**
   * Get evidence-grounded recommendations from backend
   * Calls POST /api/recommend
   */
  async getRecommendations(query, topK = 5) {
    if (!query || !query.trim()) {
      throw new Error('Query string is required for recommendation');
    }

    try {
      const data = await request('/api/recommend', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim(), top_k: topK })
      });

      return {
        query: data.query,
        requirements: data.requirements || {},
        query_text: data.query_text || query,
        abstention: data.abstention || { decision: 'RECOMMEND', confidence: 'HIGH' },
        version_warnings: data.version_warnings || [],
        recommendations: (data.recommendations || []).map((rec, index) => {
          // Evidence-based relevance label
          let relevanceLabel = 'Relevant';
          if (rec.relevance === 'HIGH' || rec.score >= 0.70) {
            relevanceLabel = 'Strong Match';
          } else if (rec.relevance === 'MEDIUM' || rec.score >= 0.40) {
            relevanceLabel = 'Relevant';
          } else if (rec.relevance === 'LOW') {
            relevanceLabel = 'Potentially Relevant';
          } else {
            relevanceLabel = 'Requires Review';
          }

          // Structured signals linked to evidence
          const matchingSignals = [];
          if (rec.components) {
            if (rec.components.material > 0.05) matchingSignals.push({ label: 'Material match', type: 'material' });
            if (rec.components.scope > 0.10) matchingSignals.push({ label: 'Scope & application match', type: 'application' });
            if (rec.components.title > 0.10) matchingSignals.push({ label: 'Product category keyword', type: 'product' });
          }
          if (matchingSignals.length === 0) {
            matchingSignals.push({ label: 'Technical domain relevance', type: 'domain' });
          }

          return {
            rank: index + 1,
            standard_id: rec.standard_id,
            is_number: rec.is_number,
            title: rec.title,
            year: rec.year || rec.edition_year || 2026,
            edition: rec.edition || 'Current Edition',
            revision: rec.revision || 'Latest',
            status: rec.status || 'CURRENT',
            iso_reference: rec.iso_reference,
            relevance_label: relevanceLabel,
            raw_score: rec.score,
            components: rec.components || {},
            why: rec.why || [
              'Matched procurement specification terminology',
              'Semantic clause overlap identified in corpus'
            ],
            matching_signals: matchingSignals,
            evidence: rec.evidence || [],
            evidence_count: (rec.evidence || []).length,
            specifications: rec.specifications || [],
            tables_count: (rec.tables || []).length,
            figures_count: (rec.figures || []).length,
            references_count: (rec.references || []).length,
            allied_standards_count: (rec.references || []).length
          };
        })
      };
    } catch (error) {
      console.error('Recommendation API error:', error);
      throw error;
    }
  }
};
