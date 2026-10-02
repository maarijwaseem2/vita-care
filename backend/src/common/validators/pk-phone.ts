import { ValidateBy, ValidationOptions, buildMessage } from 'class-validator';

/**
 * Pakistani phone numbers: mobiles (03001234567, +92 300 1234567, 0092…) and
 * landlines (021-1234567, +92 42 12345678). Spaces, dashes and brackets are ignored.
 */
export function isPkPhone(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.replace(/[\s\-()]/g, '');
  return /^(?:\+92|0092|92|0)(?:3\d{9}|[1-9]\d{8,9})$/.test(v);
}

export const PK_PHONE_MESSAGE = 'Enter a valid Pakistani phone number, e.g. 03001234567';

/** @param allowEmpty optional fields: an empty string means "no phone given". */
export function IsPkPhone(opts: { allowEmpty?: boolean } = {}, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isPkPhone',
      validator: {
        validate: (v: unknown) => (opts.allowEmpty && (v === '' || v == null)) || isPkPhone(v),
        defaultMessage: buildMessage(() => PK_PHONE_MESSAGE, options),
      },
    },
    options,
  );
}
