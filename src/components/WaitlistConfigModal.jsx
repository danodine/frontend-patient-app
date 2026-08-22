import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { COLORS, FONT_FAMILY } from "../styles/theme";

// "YYYY-MM-DD" from a local Date.
function fmtDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
// Human "24 May" style, short.
function fmtDateShort(d, es) {
  return d.toLocaleDateString(es ? "es-ES" : "en-US", { day: "numeric", month: "short" });
}
// "HH:MM" (24h) for the API.
function fmtTime24(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
// "10:30 AM" for display.
function fmtTime12(d) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Advanced waitlist configuration: single day or a date range, and either any
 * time or a time-of-day window. Returns criteria to onConfirm as
 * { dateFrom, dateTo, timeFrom, timeTo } (dates "YYYY-MM-DD"; times "HH:MM" or null).
 */
export default function WaitlistConfigModal({ visible, defaultDate, language, loading, onClose, onConfirm }) {
  const es = language !== "en";
  const baseDate = useMemo(() => {
    const d = defaultDate ? new Date(`${defaultDate}T00:00:00`) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  }, [defaultDate]);

  const [dateMode, setDateMode] = useState("single"); // 'single' | 'range'
  const [fromDate, setFromDate] = useState(baseDate);
  const [toDate, setToDate] = useState(baseDate);
  const [timeMode, setTimeMode] = useState("any"); // 'any' | 'range'
  const [fromTime, setFromTime] = useState(() => { const d = new Date(baseDate); d.setHours(9, 0, 0, 0); return d; });
  const [toTime, setToTime] = useState(() => { const d = new Date(baseDate); d.setHours(17, 0, 0, 0); return d; });
  const [picker, setPicker] = useState(null); // 'from' | 'to' | 'timeFrom' | 'timeTo' | null

  const onPickerChange = (event, selected) => {
    const field = picker;
    if (Platform.OS === "android") setPicker(null);
    if (event?.type === "dismissed" || !selected) return;
    if (field === "from") {
      setFromDate(selected);
      if (toDate < selected) setToDate(selected);
    } else if (field === "to") {
      setToDate(selected);
    } else if (field === "timeFrom") {
      setFromTime(selected);
    } else if (field === "timeTo") {
      setToTime(selected);
    }
  };

  const handleConfirm = () => {
    const dateFrom = fmtDateISO(fromDate);
    const dateTo = dateMode === "range" ? fmtDateISO(toDate) : dateFrom;
    let timeFrom = null;
    let timeTo = null;
    if (timeMode === "range") {
      timeFrom = fmtTime24(fromTime);
      timeTo = fmtTime24(toTime);
    }
    onConfirm({ dateFrom, dateTo, timeFrom, timeTo });
  };

  const Seg = ({ options, value, onChange }) => (
    <View style={styles.segRow}>
      {options.map((o) => {
        const sel = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.segItem, sel && styles.segItemSel]}
            onPress={() => onChange(o.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.segText, sel && styles.segTextSel]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const FieldButton = ({ label, value, onPress }) => (
    <TouchableOpacity style={styles.fieldBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.fieldBtnLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={styles.fieldBtnValue}>{value}</Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.greyText} style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );

  const isTimeField = picker === "timeFrom" || picker === "timeTo";
  const pickerValue =
    picker === "from" ? fromDate :
    picker === "to" ? toDate :
    picker === "timeFrom" ? fromTime :
    picker === "timeTo" ? toTime : baseDate;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{es ? "Lista de espera" : "Waitlist"}</Text>
          <Text style={styles.subtitle}>
            {es
              ? "Te avisamos (push + correo) si se libera un cupo según tus preferencias."
              : "We'll notify you (push + email) if a slot frees up matching your preferences."}
          </Text>

          {/* Date */}
          <Text style={styles.sectionLabel}>{es ? "Fecha" : "Date"}</Text>
          <Seg
            options={[
              { key: "single", label: es ? "Fecha exacta" : "Exact date" },
              { key: "range", label: es ? "Rango de fechas" : "Date range" },
            ]}
            value={dateMode}
            onChange={setDateMode}
          />
          {dateMode === "single" ? (
            <FieldButton label={es ? "Día" : "Day"} value={fmtDateShort(fromDate, es)} onPress={() => setPicker("from")} />
          ) : (
            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <FieldButton label={es ? "Desde" : "From"} value={fmtDateShort(fromDate, es)} onPress={() => setPicker("from")} />
              </View>
              <View style={{ flex: 1 }}>
                <FieldButton label={es ? "Hasta" : "To"} value={fmtDateShort(toDate, es)} onPress={() => setPicker("to")} />
              </View>
            </View>
          )}

          {/* Time */}
          <Text style={styles.sectionLabel}>{es ? "Hora" : "Time"}</Text>
          <Seg
            options={[
              { key: "any", label: es ? "Cualquier hora" : "Any time" },
              { key: "range", label: es ? "Rango de horas" : "Time range" },
            ]}
            value={timeMode}
            onChange={setTimeMode}
          />
          {timeMode === "range" && (
            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <FieldButton label={es ? "Desde" : "From"} value={fmtTime12(fromTime)} onPress={() => setPicker("timeFrom")} />
              </View>
              <View style={{ flex: 1 }}>
                <FieldButton label={es ? "Hasta" : "To"} value={fmtTime12(toTime)} onPress={() => setPicker("timeTo")} />
              </View>
            </View>
          )}

          {picker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={pickerValue}
                mode={isTimeField ? "time" : "date"}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={isTimeField ? undefined : new Date()}
                onChange={onPickerChange}
                minuteInterval={isTimeField ? 15 : undefined}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity style={styles.pickerDone} onPress={() => setPicker(null)}>
                  <Text style={styles.pickerDoneText}>{es ? "Listo" : "Done"}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>{es ? "Cancelar" : "Cancel"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>{es ? "Activar aviso" : "Enable alert"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

WaitlistConfigModal.propTypes = {
  visible: PropTypes.bool,
  defaultDate: PropTypes.string,
  language: PropTypes.string,
  loading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D5DBE3", alignSelf: "center", marginBottom: 14 },
  title: { fontSize: 18, fontFamily: FONT_FAMILY.bold, color: COLORS.blackText },
  subtitle: { fontSize: 13, color: COLORS.greyText, fontFamily: FONT_FAMILY.regular, marginTop: 4, lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.blackText, marginTop: 18, marginBottom: 8 },
  segRow: { flexDirection: "row", backgroundColor: "#F0F2F5", borderRadius: 12, padding: 4 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  segItemSel: { backgroundColor: COLORS.white, ...(Platform.OS === "android" ? { elevation: 1 } : {}) },
  segText: { fontSize: 13, color: COLORS.greyText, fontFamily: FONT_FAMILY.semiBold },
  segTextSel: { color: COLORS.secondary },
  rowTwo: { flexDirection: "row", gap: 10, marginTop: 10 },
  fieldBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E4E9F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  fieldBtnLabel: { fontSize: 13, color: COLORS.greyText, fontFamily: FONT_FAMILY.regular },
  fieldBtnValue: { fontSize: 14, color: COLORS.blackText, fontFamily: FONT_FAMILY.semiBold },
  pickerWrap: { marginTop: 8, alignItems: "center" },
  pickerDone: { alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 12 },
  pickerDoneText: { color: COLORS.secondary, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
  actions: { flexDirection: "row", gap: 12, marginTop: 22 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E4E9F0",
    alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { color: COLORS.blackText, fontFamily: FONT_FAMILY.semiBold, fontSize: 15 },
  confirmBtn: {
    flex: 1.4, height: 50, borderRadius: 14, backgroundColor: COLORS.secondary,
    alignItems: "center", justifyContent: "center",
  },
  confirmBtnText: { color: COLORS.white, fontFamily: FONT_FAMILY.bold, fontSize: 15 },
});
