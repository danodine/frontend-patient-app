/**
 * Patient medications (read-only for patient app).
 * GET /api/patient-medications/:patientId
 */
import axiosInstance from "../utils/axiosInstance";

export const patientMedicationsService = {
  async getMedications(patientId, params = {}) {
    const { data } = await axiosInstance.get(`/api/patient-medications/${patientId}`, { params });
    const payload = data?.data ?? data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.medications)) return payload.medications;
    return [];
  },
};
