export const AUTH_USERNAME_MIN_LENGTH = 2;
export const AUTH_USERNAME_MAX_LENGTH = 20;
export const AUTH_PASSWORD_MIN_LENGTH = 12;
export const AUTH_PASSWORD_MAX_LENGTH = 40;
export const ROOM_NAME_MAX_LENGTH = 60;
export const QUIZ_TITLE_MAX_LENGTH = 120;
export const QUIZ_QUESTION_MAX_LENGTH = 500;
export const QUIZ_ANSWER_MAX_LENGTH = 200;
export const PRIVATE_MESSAGE_MAX_LENGTH = 1000;
export const ROOM_MESSAGE_MAX_LENGTH = 500;

const USERNAME_PATTERN = /^[\p{L}\p{N}._-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISALLOWED_CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const HTML_TAG_REGEX = /<\s*\/?\s*[a-z!][^>]*>/i;
const DANGEROUS_PROTOCOL_REGEX =
  /\b(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i;
const DANGEROUS_EVENT_HANDLER_REGEX = /\bon[a-z]+\s*=/i;

export function normalizeInput(value: string): string {
  return value.trim();
}

export function containsUnsafeUserText(value: string): boolean {
  return (
    DISALLOWED_CONTROL_CHARS_REGEX.test(value) ||
    HTML_TAG_REGEX.test(value) ||
    DANGEROUS_PROTOCOL_REGEX.test(value) ||
    DANGEROUS_EVENT_HANDLER_REGEX.test(value)
  );
}

export function validateEmail(value: string): string | null {
  const normalizedValue = normalizeInput(value).toLowerCase();

  if (normalizedValue.length === 0) {
    return "L'email est obligatoire.";
  }

  if (!EMAIL_PATTERN.test(normalizedValue)) {
    return "Le format de l'email est invalide.";
  }

  if (normalizedValue.length > 255) {
    return "L'email est trop long.";
  }

  return null;
}

export function validateUsername(value: string): string | null {
  const normalizedValue = normalizeInput(value);

  if (normalizedValue.length < AUTH_USERNAME_MIN_LENGTH) {
    return `Le pseudo doit contenir au moins ${AUTH_USERNAME_MIN_LENGTH} caractères.`;
  }

  if (normalizedValue.length > AUTH_USERNAME_MAX_LENGTH) {
    return `Le pseudo doit contenir au maximum ${AUTH_USERNAME_MAX_LENGTH} caractères.`;
  }

  if (!USERNAME_PATTERN.test(normalizedValue)) {
    return "Le pseudo ne peut contenir que des lettres, chiffres, points, tirets et underscores.";
  }

  if (containsUnsafeUserText(normalizedValue)) {
    return "Le pseudo contient du HTML ou un script interdit.";
  }

  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < AUTH_PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${AUTH_PASSWORD_MIN_LENGTH} caractères.`;
  }

  if (value.length > AUTH_PASSWORD_MAX_LENGTH) {
    return `Le mot de passe doit contenir au maximum ${AUTH_PASSWORD_MAX_LENGTH} caractères.`;
  }

  if (!/\S/.test(value)) {
    return "Le mot de passe ne peut pas être vide.";
  }

  return null;
}

export function validateSafeText(
  value: string,
  options: {
    label: string;
    minLength: number;
    maxLength: number;
  },
): string | null {
  const normalizedValue = normalizeInput(value);

  if (normalizedValue.length < options.minLength) {
    return `${options.label} doit contenir au moins ${options.minLength} caractère${options.minLength > 1 ? "s" : ""}.`;
  }

  if (normalizedValue.length > options.maxLength) {
    return `${options.label} doit contenir au maximum ${options.maxLength} caractères.`;
  }

  if (containsUnsafeUserText(normalizedValue)) {
    return `${options.label} contient du HTML ou un script interdit.`;
  }

  return null;
}

export function validateOptionalRoomName(value: string): string | null {
  const normalizedValue = normalizeInput(value);

  if (normalizedValue.length === 0) {
    return null;
  }

  return validateSafeText(normalizedValue, {
    label: "Le nom de la salle",
    minLength: 2,
    maxLength: ROOM_NAME_MAX_LENGTH,
  });
}
