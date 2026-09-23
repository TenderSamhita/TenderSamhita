/**
 * Intelligence Service — Gap detection, conflict detection, quality review, specification builder.
 */
import { request } from './apiClient';

export const intelligenceService = {
  async detectGaps(text) {
    return request('/api/tender/gaps', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async detectConflicts(text, standardId) {
    return request('/api/tender/conflicts', {
      method: 'POST',
      body: JSON.stringify({ text, standard_id: standardId }),
    });
  },

  async qualityReview(text) {
    return request('/api/tender/quality', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async buildSpecification(text, workspaceId = null) {
    return request('/api/specification/build', {
      method: 'POST',
      body: JSON.stringify({ text, workspace_id: workspaceId }),
    });
  },

  async generateTraceability(text, workspaceId = null) {
    return request('/api/traceability/matrix', {
      method: 'POST',
      body: JSON.stringify({ text, workspace_id: workspaceId }),
    });
  },
};
