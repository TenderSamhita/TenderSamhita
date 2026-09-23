/**
 * Workspace Service — CRUD + full analysis for procurement workspaces.
 */
import { request } from './apiClient';

export const workspaceService = {
  async list() {
    return request('/api/workspaces');
  },

  async get(workspaceId) {
    return request(`/api/workspaces/${workspaceId}`);
  },

  async create(data) {
    return request('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(workspaceId, data) {
    return request(`/api/workspaces/${workspaceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(workspaceId) {
    return request(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });
  },

  async fullAnalysis(text, workspaceId = null) {
    return request('/api/tender/full-analysis', {
      method: 'POST',
      body: JSON.stringify({ text, workspace_id: workspaceId }),
      timeout: 90000,
    });
  },
};
