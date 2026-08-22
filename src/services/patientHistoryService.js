/**
 * Patient clinical history (read-only for patient app).
 * GET /api/patient-history/:patientId
 */
import axiosInstance from "../utils/axiosInstance";

export const patientHistoryService = {
  async getHistory(patientId, params = {}) {
    const { data } = await axiosInstance.get(`/api/patient-history/${patientId}`, { params });
    const payload = data?.data ?? data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.entries)) return payload.entries;
    return Array.isArray(payload?.history) ? payload.history : [];
  },
};
