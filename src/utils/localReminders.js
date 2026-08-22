import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Medication/vaccine reminders are scheduled entirely on-device (local
// notifications) — there's no server push pipeline behind these; the
// backend just stores the reminder time/date the patient chose.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_TYPES = ["medication", "vaccine"];

export async function requestNotificationPermissionAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

async function cancelAllReminderNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => REMINDER_TYPES.includes(n.content?.data?.reminderType))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function scheduleMedicationReminders(medicationReminders, language) {
  for (const med of medicationReminders || []) {
    if (!med?.reminderEnabled || !med?.time || !med?.name) continue;
    const [hour, minute] = med.time.split(":").map((n) => parseInt(n, 10));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === "es" ? "Hora de tu medicamento" : "Time for your medication",
        body: med.dose ? `${med.name} — ${med.dose}` : med.name,
        data: { reminderType: "medication", name: med.name },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

async function scheduleVaccineReminders(vaccines, language) {
  for (const v of vaccines || []) {
    if (!v?.reminderDate || !v?.name) continue;
    const date = new Date(v.reminderDate);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: language === "es" ? "Recordatorio de vacuna" : "Vaccine reminder",
        body:
          language === "es"
            ? `Es hora de tu próxima dosis: ${v.name}`
            : `Time for your next dose: ${v.name}`,
        data: { reminderType: "vaccine", name: v.name },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  }
}

/**
 * Reconciles ALL local medication/vaccine reminder notifications against the
 * given (just-saved) lists — cancels everything previously scheduled by this
 * app for these two reminder types, then reschedules from scratch. Simpler
 * and safer than tracking individual notification ids across edits/removals.
 * Returns false (no-op) if the user hasn't granted notification permission —
 * reminders are optional, so a denial just means entries save without alarms.
 */
export async function syncReminderNotifications(
  { medicationReminders = [], vaccines = [] },
  language = "es",
) {
  // Local scheduled notifications aren't supported in Expo Go on web/some platforms.
  if (Platform.OS === "web") return false;

  const granted = await requestNotificationPermissionAsync();
  if (!granted) return false;

  await cancelAllReminderNotifications();
  await scheduleMedicationReminders(medicationReminders, language);
  await scheduleVaccineReminders(vaccines, language);
  return true;
}
