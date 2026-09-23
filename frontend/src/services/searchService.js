import { request } from './apiClient';
import { MOCK_STANDARDS_LIST } from './mockAdapter';

export const searchService = {
  /**
   * Search standards database
   * Calls POST /api/search
   */
  async search(query, mode = 'hybrid', topK = 15, filters = {}) {
    if (!query || !query.trim()) {
      return { query: '', results: [] };
    }

    try {
      const data = await request('/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query: query.trim(),
          mode: mode,
          top_k: topK
        }),
        timeout: 90000
      });

      return {
        query: data.query,
        mode: data.mode,
        results: (data.results || []).map(r => ({
          chunk_id: r.chunk_id,
          standard_id: r.standard_id,
          is_number: r.is_number || r.standard_id.replace(/_/g, ' '),
          title: r.title || 'Technical Specification Document',
          page: r.page,
          section: r.section || 'General Technical Requirements',
          text: r.text,
          score: r.score,
          semantic_score: r.semantic_score,
          bm25_score: r.bm25_score,
          sources: r.sources || []
        }))
      };
    } catch (error) {
      console.warn('Search endpoint failed, filtering fallback catalog:', error.message);
      const q = query.toLowerCase();
      const filtered = MOCK_STANDARDS_LIST.filter(s => 
        s.is_number.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        (s.relevance_hint && s.relevance_hint.toLowerCase().includes(q))
      );

      return {
        query: query,
        mode: mode,
        results: filtered.map((s, idx) => ({
          chunk_id: `${s.standard_id}_CHK_${idx}`,
          standard_id: s.standard_id,
          is_number: s.is_number,
          title: s.title,
          page: 1,
          section: 'Scope & Field of Application',
          text: `${s.title}. ICS: ${s.ics_code}. Department: ${s.department}. ${s.relevance_hint || ''}`,
          score: 0.95 - (idx * 0.05),
          sources: ['catalog']
        }))
      };
    }
  }
};
