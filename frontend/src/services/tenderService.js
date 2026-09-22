import { request } from './apiClient';

export const tenderService = {
  /**
   * Analyze raw tender specification text
   * Calls POST /api/tender/analyze
   */
  async analyzeText(text) {
    if (!text || !text.trim()) {
      throw new Error('Tender text is required for analysis');
    }

    const data = await request('/api/tender/analyze', {
      method: 'POST',
      body: JSON.stringify({ text: text.trim() })
    });

    return {
      requirements: data.requirements || {},
      query_text: data.query_text || text,
      page_count: data.page_count || 1,
      source_type: 'text'
    };
  },

  /**
   * Upload and extract requirements from a Tender PDF document
   * Calls POST /api/tender/upload
   */
  async uploadPdf(file) {
    if (!file) {
      throw new Error('PDF file is required');
    }

    const formData = new FormData();
    formData.append('file', file);

    const data = await request('/api/tender/upload', {
      method: 'POST',
      body: formData,
      timeout: 30000 // allow more time for PDF parsing
    });

    return {
      filename: data.filename || file.name,
      page_count: data.page_count || 1,
      requirements: data.requirements || {},
      query_text: data.query_text || '',
      source_type: 'pdf'
    };
  }
};
