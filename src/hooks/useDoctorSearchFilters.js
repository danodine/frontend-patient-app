import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import * as Location from "expo-location";

// Shared doctor-search filters (M13). Used by the Home and Citas search views
// and mirrors the filter set FindAndBook exposes: modality, specialty, language,
// private insurance, available-today, and a maximum-distance filter that needs
// the user's coordinates. Returns everything the DoctorSearchFilters panel and
// the search dispatch need.
export default function useDoctorSearchFilters() {
  const language = useSelector((state) => state.language.language);

  const [modality, setModality] = useState("both"); // both | in_person | video_call
  const [specialty, setSpecialty] = useState(null); // canonical specialty code
  const [searchLanguage, setSearchLanguage] = useState(null); // "Espanol" | "Ingles" | null
  const [acceptsInsurance, setAcceptsInsurance] = useState(false);
  const [availableToday, setAvailableToday] = useState(false);
  const [distanceEnabled, setDistanceEnabled] = useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState(20);
  const [userCoords, setUserCoords] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const hasActiveFilters =
    modality !== "both" ||
    !!specialty ||
    !!searchLanguage ||
    acceptsInsurance ||
    availableToday ||
    distanceEnabled;

  const requestUserLocation = useCallback(async () => {
    setLocatingUser(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          language === "es"
            ? "Permiso de ubicación denegado."
            : "Location permission denied.",
        );
        setDistanceEnabled(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setUserCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch {
      setLocationError(
        language === "es"
          ? "No se pudo obtener tu ubicación."
          : "Could not get your location.",
      );
      setDistanceEnabled(false);
    } finally {
      setLocatingUser(false);
    }
  }, [language]);

  const toggleDistance = useCallback(() => {
    setDistanceEnabled((prev) => {
      const next = !prev;
      if (next && !userCoords) requestUserLocation();
      return next;
    });
  }, [userCoords, requestUserLocation]);

  // Whether the distance filter is enabled but still waiting on coordinates —
  // callers should hold off dispatching a search until coords arrive.
  const distancePending = distanceEnabled && !userCoords;

  const buildParams = useCallback(
    (q) => ({
      ...(q && q.trim() ? { q: q.trim() } : {}),
      ...(specialty ? { specialty } : {}),
      modality,
      acceptsInsurance,
      language: searchLanguage,
      availableToday,
      ...(distanceEnabled && userCoords
        ? { lat: userCoords.lat, lng: userCoords.lng, maxDistanceKm }
        : {}),
    }),
    [
      specialty,
      modality,
      acceptsInsurance,
      searchLanguage,
      availableToday,
      distanceEnabled,
      userCoords,
      maxDistanceKm,
    ],
  );

  const reset = useCallback(() => {
    setModality("both");
    setSpecialty(null);
    setSearchLanguage(null);
    setAcceptsInsurance(false);
    setAvailableToday(false);
    setDistanceEnabled(false);
    setMaxDistanceKm(20);
    setLocationError(null);
  }, []);

  // A stable dependency for effects that should re-run when any filter changes.
  const filtersKey = useMemo(
    () =>
      [
        modality,
        specialty,
        searchLanguage,
        acceptsInsurance,
        availableToday,
        distanceEnabled,
        maxDistanceKm,
        userCoords ? `${userCoords.lat},${userCoords.lng}` : "",
      ].join("|"),
    [
      modality,
      specialty,
      searchLanguage,
      acceptsInsurance,
      availableToday,
      distanceEnabled,
      maxDistanceKm,
      userCoords,
    ],
  );

  return {
    // values
    modality,
    specialty,
    searchLanguage,
    acceptsInsurance,
    availableToday,
    distanceEnabled,
    maxDistanceKm,
    userCoords,
    locatingUser,
    locationError,
    // setters
    setModality,
    setSpecialty,
    setSearchLanguage,
    setAcceptsInsurance,
    setAvailableToday,
    setMaxDistanceKm,
    toggleDistance,
    // derived / helpers
    hasActiveFilters,
    distancePending,
    requestUserLocation,
    buildParams,
    reset,
    filtersKey,
  };
}
