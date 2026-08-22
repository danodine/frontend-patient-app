/**
 * Form-data helpers for PATCH profile (e.g. patient/doctor me).
 * Kept in a separate file to avoid require cycle: store -> userSlice -> helpers -> store.
 */
export const appendPhoto = (formData, uri) => {
  if (!uri) return;
  const name = uri.split("/").pop();
  const ext = name.split(".").pop();
  const type = `image/${ext}`;
  formData.append("photo", { uri, name, type });
};

export const appendSimpleFields = (formData, userData) => {
  for (const key in userData) {
    if (key !== "profileImageUri" && key !== "profile") {
      const value = userData[key];
      if (Array.isArray(value) || (typeof value === "object" && value !== null && typeof value !== "string")) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  }
};

export const appendProfileFields = (formData, profile) => {
  if (!profile) return;
  const { address, medicalConditions, vaccines, ...rest } = profile;
  if (address) {
    formData.append("profile.address.street", address.street);
    formData.append("profile.address.city", address.city);
    formData.append("profile.address.country", address.country);
  }
  if (medicalConditions) {
    formData.append("profile.medicalConditions", JSON.stringify(medicalConditions));
  }
  if (vaccines) {
    formData.append("profile.vaccines", JSON.stringify(vaccines));
  }
  for (const key in rest) {
    formData.append(`profile.${key}`, rest[key]);
  }
};
