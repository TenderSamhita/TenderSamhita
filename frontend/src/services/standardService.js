import { request } from './apiClient';
import { MOCK_STANDARDS, MOCK_STANDARDS_LIST } from './mockAdapter';

const isDev = import.meta.env.DEV;

export const standardService = {
  async getStandard(standardId) {
    try {
      const data = await request(`/api/standards/${encodeURIComponent(standardId)}`);
      return {
        standard_id: data.standard_id || standardId,
        is_number: data.is_number || data.normalized_identifier || standardId.replace(/_/g, ' '),
        title: data.title || 'Indian Standard Specification',
        edition_year: data.year || data.edition_year || null,
        edition: data.revision ? `${data.revision} Revision` : 'Current Edition',
        revision: data.revision || null,
        status: data.status || 'CURRENT',
        ics_code: data.ics_code || null,
        iso_reference: data.iso_reference || null,
        page_count: data.page_count || null,
        pdf_path: data.pdf_path || null,
        sections: data.sections || [],
        specifications: data.specifications || [],
        scope: data.scope || data.scope_text || null,
        keywords: data.keywords || [],
      };
    } catch (error) {
      console.warn(`API failed for standard ${standardId}, trying mock:`, error.message);
      if (MOCK_STANDARDS[standardId]) {
        return MOCK_STANDARDS[standardId];
      }
      return {
        standard_id: standardId,
        is_number: standardId.replace(/_/g, ' '),
        title: 'Indian Standard (Corpus Node)',
        edition_year: null,
        status: 'UNKNOWN',
        sections: [],
        specifications: [],
        scope: null,
      };
    }
  },

  async getFigures(standardId) {
    try {
      const data = await request(`/api/standards/${encodeURIComponent(standardId)}/figures`);
      const figures = (data.figures || []).map(f => ({
        figure_id: f.figure_id,
        figure_number: f.figure_number || `Figure ${f.page}`,
        caption: f.caption || 'Technical Diagram',
        page: f.page || 1,
        section: f.section || null,
        confidence: f.confidence !== undefined ? f.confidence : 0.85,
        is_confirmed: Boolean(f.is_confirmed),
        image_path: f.image_path || `/figures/${standardId}_fig${f.page}.png`
      }));
      return {
        confirmed: figures.filter(f => f.is_confirmed),
        candidates: figures.filter(f => !f.is_confirmed)
      };
    } catch (error) {
      console.warn(`Figures fetch failed for ${standardId}:`, error.message);
      const mock = MOCK_STANDARDS[standardId]?.figures || [];
      return {
        confirmed: mock.filter(f => f.is_confirmed),
        candidates: mock.filter(f => !f.is_confirmed)
      };
    }
  },

  async getTables(standardId) {
    try {
      const data = await request(`/api/standards/${encodeURIComponent(standardId)}/tables`);
      if (data.tables && data.tables.length > 0) {
        return data.tables;
      }
    } catch (error) {
      console.warn(`Tables fetch failed for ${standardId}:`, error.message);
    }
    return MOCK_STANDARDS[standardId]?.tables || [];
  },

  async getReferences(standardId) {
    try {
      const data = await request(`/api/standards/${encodeURIComponent(standardId)}/references`);
      if (data.references && data.references.length > 0) {
        return data.references.map(r => ({
          target: r.target || 'Referenced Standard',
          title: r.raw || r.title || 'Technical Reference',
          type: r.type || 'Normative Reference',
          page: r.page || 1,
          is_indexed: true,
          standard_id: r.target ? r.target.replace(/[\s\(\):]/g, '_') : null
        }));
      }
    } catch (error) {
      console.warn(`References fetch failed for ${standardId}:`, error.message);
    }
    return MOCK_STANDARDS[standardId]?.references || [];
  },

  async getAlliedStandards(standardId) {
    try {
      const refs = await this.getReferences(standardId);
      return refs.map(r => ({
        standard_id: r.standard_id || standardId,
        is_number: r.target,
        title: r.title,
        relationship: r.type,
        relationship_type: r.type.toLowerCase().includes('test') ? 'test_method' : 'normative_reference'
      }));
    } catch (error) {
      return MOCK_STANDARDS[standardId]?.allied_standards || [];
    }
  },

  async getConformity(standardId) {
    return MOCK_STANDARDS[standardId]?.conformity || {
      qco_applicable: "NOT FOUND",
      certification_required: "Review Required by Procurement Officer",
    };
  },

  async getVersionHistory(standardId) {
    return MOCK_STANDARDS[standardId]?.version_history || {
      current_version: standardId.replace(/_/g, ' '),
      review_status: "CURRENT",
      timeline: []
    };
  },

  async listStandards(query = '', category = 'ALL') {
    if (MOCK_STANDARDS_LIST) {
      let list = [...MOCK_STANDARDS_LIST];
      if (query && query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(s =>
          s.is_number.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q)
        );
      }
      return list;
    }
    return [];
  }
};
