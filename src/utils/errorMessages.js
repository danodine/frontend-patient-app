// Shared helpers for turning backend/network errors into clear, localized
// user-facing messages, and for validating common field formats.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @param {*} value @returns {boolean} true if value looks like a valid email address */
export function isValidEmail(value) {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim());
}

const MESSAGES = {
  es: {
    emailInvalid: "El formato del correo electrónico no es válido.",
    network: "No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.",
    timeout: "La solicitud tardó demasiado tiempo en responder. Intenta nuevamente.",
    generic: "Ocurrió un error. Por favor, intenta nuevamente.",
  },
  en: {
    emailInvalid: "The email format is not valid.",
    network: "Could not connect to the server. Check your internet connection and try again.",
    timeout: "The request took too long to respond. Please try again.",
    generic: "Something went wrong. Please try again.",
  },
};

function m(language) {
  return MESSAGES[language] || MESSAGES.es;
}

export function getEmailInvalidMessage(language) {
  return m(language).emailInvalid;
}

// Raw backend/driver text (Mongoose validation, stack traces, etc.) that should
// never be shown to the user as-is — fall back to a friendly message instead.
const LOOKS_TECHNICAL =
  /Path `.+` is required|Cast to \w+ failed|ObjectId|E11000|is not a valid enum value|at \w+\.\w+ \(|\.js:\d+:\d+/i;

/**
 * Turn any axios error into a safe, clear, localized message for display to the user.
 * Never surfaces raw "Network Error", Mongoose validation text, or stack traces.
 * @param {*} err - error thrown by axios (or a plain Error)
 * @param {string} [language] - "es" | "en"
 * @param {string} [fallback] - message to use when nothing specific/safe is available
 * @returns {string}
 */
export function getUserFacingErrorMessage(err, language, fallback) {
  const dict = m(language);
  const finalFallback = fallback || dict.generic;

  if (err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "")) {
    return dict.timeout;
  }
  if (err?.code === "ERR_NETWORK" || err?.message === "Network Error" || !err?.response) {
    return dict.network;
  }

  const data = err.response?.data;
  let message = null;

  if (Array.isArray(data?.errors)) {
    const parts = data.errors.map((e) => e?.msg || e?.message).filter(Boolean);
    if (parts.length && !parts.some((p) => LOOKS_TECHNICAL.test(p))) {
      message = parts.join(". ");
    }
  } else if (data?.errors && typeof data.errors === "object") {
    const parts = Object.values(data.errors)
      .map((e) => (typeof e === "string" ? e : e?.message))
      .filter(Boolean);
    if (parts.length && !parts.some((p) => LOOKS_TECHNICAL.test(p))) {
      message = parts.join(". ");
    }
  } else if (typeof data?.message === "string" && data.message.trim()) {
    message = data.message;
  } else if (data?.error) {
    message = typeof data.error === "string" ? data.error : data.error?.message;
  }

  if (message && !LOOKS_TECHNICAL.test(message)) {
    return message;
  }

  return finalFallback;
}
