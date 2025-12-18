import api from './api';

export const workflowService = {
  createLog: (action, entityType = null, relevantId = null) => {
    const data = { action };
    if (entityType) data.entity_type = entityType;
    if (relevantId) data.relevant_id = relevantId;
    return api.post('/v1/workflow/logs', data);
  },
  getAllLogs: (skip = 0, limit = 100) => api.get('/v1/workflow/logs', {
    params: { skip, limit }
  }),
  getUserLogs: (userId, skip = 0, limit = 100) => api.get(`/v1/workflow/logs/user/${userId}`, {
    params: { skip, limit }
  }),
};
