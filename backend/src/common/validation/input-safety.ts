import { BadRequestException } from "@nestjs/common";
import { Transform } from "class-transformer";
import { registerDecorator, ValidationOptions } from "class-validator";

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

export const USERNAME_PATTERN = /^[\p{L}\p{N}._-]+$/u;

const DISALLOWED_CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const HTML_TAG_REGEX = /<\s*\/?\s*[a-z!][^>]*>/i;
const DANGEROUS_PROTOCOL_REGEX =
  /\b(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i;
const DANGEROUS_EVENT_HANDLER_REGEX = /\bon[a-z]+\s*=/i;

export function trimStringValue(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export function trimStringArrayValue(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((entry) => (typeof entry === "string" ? entry.trim() : entry));
}

export function trimOptionalStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export function normalizeEmailValue(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

export function Trim(): PropertyDecorator {
  return Transform(({ value }) => trimStringValue(value));
}

export function TrimArrayStrings(): PropertyDecorator {
  return Transform(({ value }) => trimStringArrayValue(value));
}

export function TrimToUndefined(): PropertyDecorator {
  return Transform(({ value }) => trimOptionalStringToUndefined(value));
}

export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }) => normalizeEmailValue(value));
}

export function containsUnsafeText(value: string): boolean {
  return (
    DISALLOWED_CONTROL_CHARS_REGEX.test(value) ||
    HTML_TAG_REGEX.test(value) ||
    DANGEROUS_PROTOCOL_REGEX.test(value) ||
    DANGEROUS_EVENT_HANDLER_REGEX.test(value)
  );
}

export function assertSafeTextInput(value: string, fieldLabel: string): void {
  if (containsUnsafeText(value)) {
    throw new BadRequestException(
      `${fieldLabel} contient du HTML ou un script interdit`,
    );
  }
}

export function IsSafeText(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    registerDecorator({
      name: "isSafeText",
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === "string" && !containsUnsafeText(value);
        },
        defaultMessage() {
          return "Le champ contient du HTML ou un script interdit";
        },
      },
    });
  };
}
