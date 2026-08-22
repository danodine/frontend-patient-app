import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Platform,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { callPhone, getMainSpecialtyDisplay } from "../../../utils/helpers";
import PropTypes from "prop-types";
import { BASE_URL, WEB_APP_URL } from "../../../../config";
import STRINGS from "../../../constants/strings";
import { COLORS, PADDINGS } from "../../../styles/theme";
import styles from "./styles";
import {
  getDoctorById,
  getDoctorClinicSchedules,
  fetchFavoriteDoctors,
  addFavoriteDoctor,
  removeFavoriteDoctor,
} from "../../../redux/doctorSlice";
import { getOrCreateConversation } from "../../../redux/chatSlice";

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Monday-first order for the day pills (Sunday last), matching the design.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DoctorProfileScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const rawDoctor = route.params?.doctor ?? (route.params?.doctorId ? { _id: route.params.doctorId } : null);
  const language = useSelector((state) => state.language.language);
  const doctorFromApi = useSelector((state) => state.doctor?.doctor ?? {});
  const appointmentTypesForDoctor = useSelector((state) => state.doctor?.appointmentTypesForDoctor ?? []);
  const doctorClinicSchedule = useSelector((state) => state.doctor?.doctorClinicSchedule ?? null);
  const favoriteDoctorIds = useSelector((state) => state.doctor?.favoriteDoctorIds ?? []);

  const { showActionSheetWithOptions } = useActionSheet();

  useEffect(() => {
    dispatch(fetchFavoriteDoctors());
  }, [dispatch]);

  const isFavorite = favoriteDoctorIds.includes(rawDoctor?._id);
  const handleToggleFavorite = () => {
    if (!rawDoctor?._id) return;
    if (isFavorite) dispatch(removeFavoriteDoctor(rawDoctor._id));
    else dispatch(addFavoriteDoctor(rawDoctor._id));
  };

  useEffect(() => {
    const id = rawDoctor?._id;
    if (id) dispatch(getDoctorById({ id }));
  }, [rawDoctor?._id, dispatch]);

  // Re-fetch whenever the screen regains focus. FindAndBook (the booking screen)
  // clears the shared doctor state on unmount, so returning here would otherwise
  // wipe the profile until a manual refresh.
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      const id = rawDoctor?._id;
      if (id) dispatch(getDoctorById({ id }));
    });
    return unsub;
  }, [navigation, rawDoctor?._id, dispatch]);

  // Hold the last full doctor locally so the profile keeps rendering even when
  // the shared Redux doctor state is cleared elsewhere (e.g. booking screen
  // cleanup). Only the matching-id full record ever replaces it; it's never
  // cleared, which avoids the "info disappears on return" flash.
  const [fullDoctor, setFullDoctor] = useState(rawDoctor || null);
  useEffect(() => {
    if (doctorFromApi?._id && doctorFromApi._id === rawDoctor?._id) {
      setFullDoctor(doctorFromApi);
    }
  }, [doctorFromApi, rawDoctor?._id]);

  // Same retention for the separately-fetched clinic schedule (days + working
  // hours). The booking screen clears it on unmount, so without this the
  // "Días disponibles" / "Horario de trabajo" sections vanish on return.
  const [retainedClinicSchedule, setRetainedClinicSchedule] = useState(null);
  useEffect(() => {
    if (
      doctorClinicSchedule?.clinicId &&
      Array.isArray(doctorClinicSchedule?.schedule) &&
      doctorClinicSchedule.schedule.length > 0
    ) {
      setRetainedClinicSchedule(doctorClinicSchedule);
    }
  }, [doctorClinicSchedule]);
  const effectiveClinicSchedule = doctorClinicSchedule ?? retainedClinicSchedule;

  const doctor = useMemo(() => {
    const raw = rawDoctor || {};
    if (fullDoctor?._id && raw?._id && fullDoctor._id === raw._id) {
      return fullDoctor;
    }
    if (doctorFromApi?._id && raw?._id && doctorFromApi._id === raw._id) {
      return doctorFromApi;
    }
    return raw;
  }, [rawDoctor, fullDoctor, doctorFromApi]);

  const displayName = doctor?.fullName ?? doctor?.name ?? "";
  const photoUri = doctor?.profileImageUrl
    ? doctor.profileImageUrl.startsWith("http")
      ? doctor.profileImageUrl
      : `${BASE_URL}${doctor.profileImageUrl}`
    : doctor?.profile?.photo
      ? `${BASE_URL}/img/users/${doctor.profile.photo}`
      : null;
  const specialtyDisplay = getMainSpecialtyDisplay(doctor, language) || "-";
  const yearsExp =
    doctor?.yearsOfExperience ??
    doctor?.experience ??
    doctor?.profile?.yearsOfExperience ??
    null;

  // Consultation modalities the doctor offers, derived from their appointment
  // types (each has allowsInPerson / allowsVideoCall). Video also requires the
  // admin-level videoCallsEnabled gate. Only show badges for the matching id.
  const types = Array.isArray(appointmentTypesForDoctor) ? appointmentTypesForDoctor : [];
  const typesMatchDoctor =
    doctorFromApi?._id && doctor?._id && doctorFromApi._id === doctor._id;
  const relevantTypes = typesMatchDoctor ? types : [];
  const offersInPerson = relevantTypes.some((t) => t?.allowsInPerson !== false);
  const offersVideo =
    doctor?.videoCallsEnabled !== false &&
    relevantTypes.some((t) => !!t?.allowsVideoCall);

  const clinics = useMemo(() => {
    const c = doctor?.clinics;
    return Array.isArray(c) ? c.filter((x) => x && x._id) : [];
  }, [doctor?.clinics]);

  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const availabilitySource = useMemo(
    () => doctor?.profile?.availability ?? doctor?.availability ?? [],
    [doctor?.profile?.availability, doctor?.availability],
  );

  const locationList = useMemo(() => {
    const locations = new Set();
    for (const entry of availabilitySource) {
      const slots = entry?.timeSlots ?? entry?.slots ?? [];
      for (const slot of slots) {
        const loc = slot?.location ?? entry?.location ?? entry?.place ?? "";
        if (typeof loc === "string" && loc.trim()) locations.add(loc.trim());
      }
    }
    const list = [...locations];
    if (list.length > 0) return list;
    if (availabilitySource.length > 0) {
      return [language === "es" ? "Consultorio" : "Office"];
    }
    return [];
  }, [availabilitySource, language]);

  useEffect(() => {
    if (clinics.length >= 1) setSelectedClinic((prev) => prev ?? clinics[0]);
  }, [clinics.length, clinics[0]?._id]);

  useEffect(() => {
    if (locationList.length === 1) setSelectedLocation(locationList[0]);
  }, [locationList.length]);

  useEffect(() => {
    const doctorId = doctor?._id;
    const clinicId = selectedClinic?._id;
    if (!doctorId || !clinicId) return;
    dispatch(getDoctorClinicSchedules({ doctorId, clinicId }));
  }, [doctor?._id, selectedClinic?._id, dispatch]);

  const dayNames = STRINGS[language]?.daysOfWeek ?? DAY_NAMES_EN;

  const scheduleForSelectedClinic = useMemo(() => {
    const sel = selectedClinic;
    if (!doctor || !sel) return [];
    const clinicName = (sel?.name ?? sel?._id ?? "").trim().toLowerCase();
    const dayMap = new Map();
    const toLocalizedDay = (dayKey) => {
      if (dayKey == null && dayKey !== 0) return "";
      if (typeof dayKey === "number" && dayKey >= 0 && dayKey <= 6) return dayNames[dayKey] ?? String(dayKey);
      const str = String(dayKey);
      const enIndex = DAY_NAMES_EN.indexOf(str);
      if (enIndex >= 0) return dayNames[enIndex] ?? str;
      return str;
    };
    const addSlot = (dayKey, from, to) => {
      const dayStr = toLocalizedDay(dayKey);
      if (!dayStr) return;
      if (!dayMap.has(dayStr)) dayMap.set(dayStr, []);
      dayMap.get(dayStr).push({ from: from ?? "", to: to ?? "" });
    };
    const clinicSchedule = sel?.schedule ?? sel?.schedules ?? sel?.availability;
    if (Array.isArray(clinicSchedule)) {
      for (const entry of clinicSchedule) {
        const day = entry.dayOfWeek ?? entry.day ?? entry.dayOfWeekNumber;
        const slots =
          entry?.slots ??
          entry?.timeSlots ??
          (entry.startTime ? [{ from: entry.startTime, to: entry.endTime }] : []);
        for (const slot of slots) {
          addSlot(
            day,
            slot.from ?? slot.startTime ?? slot.start,
            slot.to ?? slot.endTime ?? slot.end,
          );
        }
      }
    }
    const availability = doctor?.profile?.availability ?? doctor?.availability ?? [];
    for (const entry of availability) {
      for (const slot of entry?.timeSlots ?? entry?.slots ?? []) {
        const loc = (slot?.location ?? "").trim().toLowerCase();
        if (!clinicName || loc === clinicName || loc.includes(clinicName) || clinicName.includes(loc)) {
          addSlot(entry.day, slot.from ?? slot.startTime, slot.to ?? slot.endTime);
        }
      }
    }
    let result = Array.from(dayMap, ([day, slots]) => ({ day, slots })).filter((e) => e.slots.length > 0);
    const fetchedSchedule = effectiveClinicSchedule?.schedule;
    if (
      result.length === 0 &&
      effectiveClinicSchedule?.clinicId === sel._id &&
      Array.isArray(fetchedSchedule) &&
      fetchedSchedule.length > 0
    ) {
      result = fetchedSchedule.map((e) => ({
        day: toLocalizedDay(e.day),
        slots: Array.isArray(e.slots) ? e.slots : [],
      }));
    }
    return result;
  }, [doctor, selectedClinic, effectiveClinicSchedule, dayNames]);

  const times = useMemo(() => {
    if (clinics.length > 0) return [];
    const dayMap = new Map();
    const normalizedLocation = selectedLocation?.trim()?.toLowerCase();
    const isSinglePlaceholder =
      locationList.length === 1 &&
      (locationList[0] === "Consultorio" || locationList[0] === "Office");
    for (const entry of availabilitySource) {
      const slots = entry?.timeSlots ?? entry?.slots ?? [];
      for (const slot of slots) {
        const slotLoc = (slot?.location ?? entry?.location ?? entry?.place ?? "").trim().toLowerCase();
        const matches = isSinglePlaceholder || !normalizedLocation || slotLoc === normalizedLocation;
        if (matches) {
          const day = entry.day ?? entry.dayOfWeek ?? "";
          if (!day && day !== 0) continue;
          const dayKey =
            typeof day === "number"
              ? dayNames[day] ?? day
              : DAY_NAMES_EN.indexOf(String(day)) >= 0
                ? dayNames[DAY_NAMES_EN.indexOf(String(day))]
                : day;
          if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
          dayMap.get(dayKey).push({
            from: slot.from ?? slot.startTime ?? slot.start ?? "",
            to: slot.to ?? slot.endTime ?? slot.end ?? "",
          });
        }
      }
    }
    return Array.from(dayMap, ([day, slots]) => ({ day, slots }));
  }, [selectedLocation, availabilitySource, clinics.length, locationList, dayNames]);

  const scheduleRows = clinics.length > 0 ? scheduleForSelectedClinic : times;

  // Weekday indices (0=Sun..6=Sat) that have availability, for the day pills.
  const availableDayIndices = useMemo(() => {
    const set = new Set();
    for (const row of scheduleRows) {
      const idx = dayNames.indexOf(row.day);
      if (idx >= 0 && (row.slots?.length ?? 0) > 0) set.add(idx);
    }
    return set;
  }, [scheduleRows, dayNames]);

  // A representative working-hours summary (first slot) + a day-range label.
  const workingHours = useMemo(() => {
    const first = scheduleRows[0]?.slots?.[0];
    const range = first?.from && first?.to ? `${first.from} - ${first.to}` : null;
    const idxs = [...availableDayIndices].sort((a, b) => a - b);
    let daysLabel = "";
    if (idxs.length === 1) daysLabel = dayNames[idxs[0]];
    else if (idxs.length > 1) daysLabel = `${dayNames[idxs[0]]} - ${dayNames[idxs[idxs.length - 1]]}`;
    return { range, daysLabel };
  }, [scheduleRows, availableDayIndices, dayNames]);

  const asArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []);
  const nameOf = (item, ...keys) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      for (const k of keys) if (item[k]) return item[k];
    }
    return "";
  };

  const insurancesList = useMemo(() => {
    const d = doctor ?? {};
    const raw =
      d.insurances ??
      d.profile?.insurances ??
      d.acceptedInsurances ??
      (d.insurance != null ? asArray(d.insurance) : null) ??
      (d.profile?.insurance != null ? asArray(d.profile.insurance) : null);
    return asArray(raw).map((x) => nameOf(x, "name", "companyName", "title")).filter(Boolean);
  }, [doctor]);

  const servicesList = useMemo(() => {
    const raw = doctor?.treatments ?? doctor?.profile?.treatments ?? [];
    return asArray(raw).map((x) => nameOf(x, "treatmentName", "name")).filter(Boolean);
  }, [doctor]);

  const paymentList = useMemo(() => {
    const raw = doctor?.paymentMethods ?? doctor?.profile?.paymentMethods ?? [];
    return asArray(raw).map((x) => nameOf(x, "name", "method")).filter(Boolean);
  }, [doctor]);

  const languagesList = useMemo(() => {
    const raw = doctor?.languages ?? doctor?.profile?.languages ?? [];
    return asArray(raw).map((x) => nameOf(x, "name", "language")).filter(Boolean);
  }, [doctor]);

  const clinicAddress = (clinic) =>
    clinic?.address ??
    clinic?.locationReference ??
    [clinic?.city, clinic?.country].filter(Boolean).join(", ") ??
    "";

  const handleBack = () => navigation.goBack();

  const handleBookAppointment = () => {
    navigation.navigate("FindAndBook", { doctor, fromDoctorProfile: true });
  };

  const handleConsult = async () => {
    const id = doctor?._id;
    if (!id) return;
    try {
      const conv = await dispatch(getOrCreateConversation({ doctorId: id })).unwrap();
      const convId = conv?._id ?? conv?.conversation?._id;
      if (!convId) return;
      navigation.getParent()?.navigate("Messages", {
        screen: "Conversation",
        params: { conversationId: convId, title: displayName },
      });
    } catch (_) {
      // getOrCreateConversation already surfaces a localized error via the slice.
    }
  };

  const handleShare = () => {
    const id = rawDoctor?._id;
    if (!id) return;
    const url = `${WEB_APP_URL}/doctor/${id}`;
    const message =
      language === "es"
        ? `Te comparto el perfil de ${displayName || "este médico"} en HeiDoctor: ${url}`
        : `Check out ${displayName || "this doctor"}'s profile on HeiDoctor: ${url}`;
    Share.share({ message, url });
  };

  const handleMenu = () => {
    const shareLabel = language === "es" ? "Compartir médico" : "Share doctor";
    const cancelLabel = STRINGS[language]?.appointments?.cancel ?? (language === "es" ? "Cancelar" : "Cancel");
    showActionSheetWithOptions(
      { options: [shareLabel, cancelLabel], cancelButtonIndex: 1 },
      (i) => {
        if (i === 0) handleShare();
      },
    );
  };

  const openMapPrompt = async (address) => {
    const query = encodeURIComponent(address);
    const options = [STRINGS[language].maps.openGoogleMaps, STRINGS[language].maps.openWays];
    if (Platform.OS === "ios") options.push(STRINGS[language].maps.openAppleMaps);
    options.push(STRINGS[language].appointments.cancel);
    const cancelButtonIndex = options.length - 1;
    showActionSheetWithOptions({ options, cancelButtonIndex }, async (buttonIndex) => {
      if (buttonIndex === 0) {
        const canOpen = await Linking.canOpenURL("comgooglemaps://");
        Linking.openURL(canOpen ? `comgooglemaps://?q=${query}` : `https://www.google.com/maps/search/?api=1&query=${query}`);
      } else if (buttonIndex === 1) {
        const canOpen = await Linking.canOpenURL("waze://");
        Linking.openURL(canOpen ? `waze://?q=${query}&navigate=yes` : `https://waze.com/ul?q=${query}&navigate=yes`);
      } else if (Platform.OS === "ios" && buttonIndex === 2) {
        Linking.openURL(`http://maps.apple.com/?q=${query}`);
      }
    });
  };

  const openClinicMap = (clinic) => {
    const link = clinic?.googleMapsLink ?? clinic?.googleMaps ?? null;
    if (link) {
      Linking.openURL(link.startsWith("http") ? link : `https://${link}`);
      return;
    }
    const addr = clinicAddress(clinic) || clinic?.name;
    if (addr) openMapPrompt(addr);
  };

  const tDocProfile = STRINGS[language]?.doctorProfile ?? STRINGS.es?.doctorProfile ?? {};
  const tBook = STRINGS[language]?.bookAppointment ?? STRINGS.es?.bookAppointment ?? {};
  const es = language === "es";

  const L = {
    map: es ? "Mapa" : "Map",
    about: es ? "Sobre el médico" : "About the doctor",
    insurance: tDocProfile.insurance ?? (es ? "Seguros médicos" : "Insurance"),
    availableDays: es ? "Días disponibles" : "Available days",
    workingHours: es ? "Horario de trabajo" : "Working hours",
    services: es ? "Servicios" : "Services",
    payment: tDocProfile.paymentMethod ?? (es ? "Métodos de pago" : "Payment methods"),
    languages: tDocProfile.languages ?? (es ? "Idiomas" : "Languages"),
    experience: es ? "Años Experiencia" : "Years Experience",
    consultTypes: es ? "Tipo de consulta" : "Consultation types",
    inPerson: es ? "Presencial" : "In person",
    videoCall: es ? "Videollamada" : "Video call",
    consult: es ? "Consultar" : "Consult",
    book: tBook.book ?? (es ? "Reservar Cita" : "Book appointment"),
  };

  const initials = (displayName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2);

  // Reusable 2-column chip grid.
  const ChipGrid = ({ items, icon }) => (
    <View style={styles.chipGrid}>
      {items.map((label, i) => (
        <View key={`${label}-${i}`} style={styles.gridChip}>
          <Ionicons name={icon} size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
          <Text style={styles.gridChipText} numberOfLines={1}>{label}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header photo */}
        <View style={styles.header}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, styles.headerPlaceholder]}>
              <Text style={styles.headerInitials}>{initials}</Text>
            </View>
          )}
        </View>

        {/* Body card overlapping the photo */}
        <View style={styles.body}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.specialty}>{specialtyDisplay}</Text>
          {yearsExp != null && String(yearsExp).trim() !== "" ? (
            <View style={styles.experienceRow}>
              <View style={styles.experienceBar} />
              <Text style={styles.experienceText}>
                <Text style={styles.experienceStrong}>{`${yearsExp}+ `}</Text>
                {L.experience}
              </Text>
            </View>
          ) : null}

          {/* Consultation modalities the doctor offers (in-person / video). */}
          {(offersInPerson || offersVideo) && (
            <View style={styles.modalityRow}>
              {offersInPerson && (
                <View style={styles.modalityBadge}>
                  <Ionicons name="business-outline" size={15} color={COLORS.secondary} />
                  <Text style={styles.modalityBadgeText}>{L.inPerson}</Text>
                </View>
              )}
              {offersVideo && (
                <View style={styles.modalityBadge}>
                  <Ionicons name="videocam-outline" size={15} color={COLORS.secondary} />
                  <Text style={styles.modalityBadgeText}>{L.videoCall}</Text>
                </View>
              )}
            </View>
          )}

          {/* Clinics */}
          {clinics.length > 0 && (
            <View style={{ marginTop: 16 }}>
              {clinics.map((clinic) => {
                const isSelected = selectedClinic?._id === clinic._id;
                const addr = clinicAddress(clinic);
                return (
                  <TouchableOpacity
                    key={clinic._id}
                    activeOpacity={0.85}
                    onPress={() => setSelectedClinic(clinic)}
                    style={[styles.clinicCard, isSelected && styles.clinicCardSelected]}
                  >
                    <View style={styles.clinicIconWrap}>
                      <Ionicons name="business" size={20} color={COLORS.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.clinicTopRow}>
                        <Text style={styles.clinicName} numberOfLines={2}>{clinic.name ?? clinic._id}</Text>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); openClinicMap(clinic); }}
                          style={styles.mapLinkWrap}
                        >
                          <Ionicons name="location-outline" size={14} color={COLORS.secondary} />
                          <Text style={styles.mapLinkText}>{L.map}</Text>
                        </TouchableOpacity>
                      </View>
                      {addr ? <Text style={styles.clinicAddress} numberOfLines={2}>{addr}</Text> : null}
                      {isSelected && workingHours.range ? (
                        <View style={styles.clinicHoursRow}>
                          <Ionicons name="time-outline" size={13} color={COLORS.greyText} />
                          <Text style={styles.clinicHoursText}>
                            {workingHours.daysLabel ? `${workingHours.daysLabel} ` : ""}({workingHours.range})
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.clinicActions}>
                      {doctor?.phone ? (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); callPhone(doctor.phone); }}
                          style={styles.roundAction}
                        >
                          <Ionicons name="call" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); handleConsult(); }}
                        style={styles.roundAction}
                      >
                        <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Location selector (doctors without registered clinics) */}
          {clinics.length === 0 && locationList.length >= 1 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>{tDocProfile.selectLocation}</Text>
              {locationList.map((loc, index) => {
                const isSel = selectedLocation === loc;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    onPress={() => setSelectedLocation(loc)}
                    style={[styles.clinicCard, isSel && styles.clinicCardSelected]}
                  >
                    <View style={styles.clinicIconWrap}>
                      <Ionicons name="location" size={20} color={COLORS.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clinicName}>{loc}</Text>
                    </View>
                    {loc !== "Consultorio" && loc !== "Office" ? (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); openMapPrompt(`${loc}, ${doctor?.profile?.address?.city ?? ""}, ${doctor?.profile?.address?.country ?? ""}`); }}
                        style={styles.mapLinkWrap}
                      >
                        <Ionicons name="location-outline" size={14} color={COLORS.secondary} />
                        <Text style={styles.mapLinkText}>{L.map}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* About */}
          {(doctor?.biography || specialtyDisplay !== "-") && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{L.about}</Text>
              <Text style={styles.bodyText}>
                {doctor?.biography ??
                  `${specialtyDisplay === "-" ? "" : specialtyDisplay}${es ? " con experiencia." : " with experience."}`}
              </Text>
            </View>
          )}

          {/* Insurance */}
          {insurancesList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{L.insurance}</Text>
              <ChipGrid items={insurancesList} icon="shield-checkmark-outline" />
            </View>
          )}

          {/* Available days */}
          {availableDayIndices.size > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{L.availableDays}</Text>
              <View style={styles.dayRow}>
                {WEEKDAY_ORDER.map((idx) => {
                  const on = availableDayIndices.has(idx);
                  const label = (dayNames[idx] ?? "").slice(0, 3);
                  return (
                    <View key={idx} style={[styles.dayPill, on && styles.dayPillOn]}>
                      <Text style={[styles.dayPillText, on && styles.dayPillTextOn]}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Working hours */}
          {workingHours.range && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{L.workingHours}</Text>
              <View style={styles.hoursCard}>
                <View style={styles.hoursIconWrap}>
                  <Ionicons name="time-outline" size={20} color={COLORS.secondary} />
                </View>
                <View>
                  <Text style={styles.hoursRange}>{workingHours.range}</Text>
                  {workingHours.daysLabel ? <Text style={styles.hoursDays}>{workingHours.daysLabel}</Text> : null}
                </View>
              </View>
            </View>
          )}

          {/* Services */}
          {servicesList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{L.services}</Text>
              <ChipGrid items={servicesList} icon="medkit-outline" />
            </View>
          )}

          {/* Payment methods */}
          {paymentList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{L.payment}</Text>
              <ChipGrid items={paymentList} icon="card-outline" />
            </View>
          )}

          {/* Languages */}
          {languagesList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{L.languages}</Text>
              <ChipGrid items={languagesList} icon="globe-outline" />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating header buttons */}
      <TouchableOpacity style={[styles.circleBtn, { top: insets.top + 8, left: PADDINGS.screenEdge }]} onPress={handleBack}>
        <Ionicons name="arrow-back" size={20} color={COLORS.blackText} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.circleBtn, { top: insets.top + 8, right: PADDINGS.screenEdge + 48 }]}
        onPress={handleToggleFavorite}
        accessibilityLabel={isFavorite ? (es ? "Quitar de favoritos" : "Remove from favorites") : (es ? "Agregar a favoritos" : "Add to favorites")}
      >
        <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={20} color={isFavorite ? "#EF4444" : COLORS.blackText} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.circleBtn, { top: insets.top + 8, right: PADDINGS.screenEdge }]} onPress={handleMenu}>
        <Ionicons name="ellipsis-vertical" size={20} color={COLORS.blackText} />
      </TouchableOpacity>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.consultBtn} onPress={handleConsult} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.secondary} style={{ marginRight: 8 }} />
          <Text style={styles.consultBtnText}>{L.consult}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBookAppointment} activeOpacity={0.85}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={styles.bookBtnText}>{L.book}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

DoctorProfileScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      doctor: PropTypes.shape({
        name: PropTypes.string,
        specialtyId: PropTypes.string,
        profile: PropTypes.any,
        phone: PropTypes.any,
        email: PropTypes.string,
      }),
      doctorId: PropTypes.string,
    }),
  }).isRequired,
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func,
    getParent: PropTypes.func,
  }).isRequired,
};

export default DoctorProfileScreen;
