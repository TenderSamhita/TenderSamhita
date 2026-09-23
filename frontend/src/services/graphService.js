/**
 * Graph Service — Standards knowledge graph API.
 */
import { request } from './apiClient';

export const graphService = {
  async getStandardsGraph() {
    return request('/api/graph/standards');
  },

  async getStandardGraph(standardId) {
    return request(`/api/graph/standard/${encodeURIComponent(standardId)}`);
  },

  async getWorkspaceGraph(workspaceId) {
    return request(`/api/graph/workspace/${encodeURIComponent(workspaceId)}`);
  },

  async getRelationships() {
    return request('/api/graph/relationships');
  },

  async populateGraph() {
    return request('/api/graph/populate', { method: 'POST' });
  },
};
