import { type RefinementCtx, z } from "zod";

export const staticTextSchema = z.string().trim().min(1, "Value must not be blank.");

function normalizedStaticText(value: string): string {
  return value.toLocaleLowerCase("en-AU");
}

export function addDuplicateIssues<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
  context: RefinementCtx,
  label: string,
): void {
  const seen = new Map<string, number>();

  values.forEach((value, index) => {
    const key = normalizedStaticText(keyFor(value));
    const firstIndex = seen.get(key);

    if (firstIndex === undefined) {
      seen.set(key, index);
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate ${label}; first defined at index ${firstIndex}.`,
      path: [index],
    });
  });
}

export function uniqueStaticTextListSchema(itemSchema = staticTextSchema) {
  return z
    .array(itemSchema)
    .min(1, "List must contain at least one value.")
    .superRefine((values, context) => {
      addDuplicateIssues(values, (value) => value, context, "value");
    });
}
