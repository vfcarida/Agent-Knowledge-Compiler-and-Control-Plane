import { z } from "zod";

/**
 * Deterministically compiles a JSON Schema (Draft-07 / 2020-12 subset) object
 * into a runtime Zod validator schema for MCP tool input/output contract enforcement.
 */
export function compileJsonSchemaToZod(
  schema: Record<string, unknown> | undefined,
): z.ZodTypeAny {
  if (!schema || Object.keys(schema).length === 0) {
    return z.record(z.unknown());
  }

  // Handle enum constraint first
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const values = schema.enum as Array<string | number | boolean | null>;
    if (values.length === 1) {
      return z.literal(values[0]);
    }
    const literals = values.map((v) => z.literal(v));
    return z.union([literals[0]!, literals[1]!, ...literals.slice(2)]);
  }

  const schemaType =
    typeof schema.type === "string"
      ? schema.type
      : schema.properties
        ? "object"
        : undefined;

  switch (schemaType) {
    case "string": {
      let strSchema = z.string();
      if (typeof schema.minLength === "number") {
        strSchema = strSchema.min(schema.minLength);
      }
      if (typeof schema.maxLength === "number") {
        strSchema = strSchema.max(schema.maxLength);
      }
      if (typeof schema.pattern === "string") {
        strSchema = strSchema.regex(new RegExp(schema.pattern));
      }
      if (schema.format === "email") {
        strSchema = strSchema.email();
      } else if (schema.format === "url" || schema.format === "uri") {
        strSchema = strSchema.url();
      } else if (schema.format === "uuid") {
        strSchema = strSchema.uuid();
      }
      return strSchema;
    }

    case "number":
    case "integer": {
      let numSchema = z.number();
      if (schemaType === "integer") {
        numSchema = numSchema.int();
      }
      if (typeof schema.minimum === "number") {
        numSchema = numSchema.min(schema.minimum);
      }
      if (typeof schema.maximum === "number") {
        numSchema = numSchema.max(schema.maximum);
      }
      return numSchema;
    }

    case "boolean":
      return z.boolean();

    case "array": {
      const itemSchema =
        schema.items && typeof schema.items === "object"
          ? compileJsonSchemaToZod(schema.items as Record<string, unknown>)
          : z.unknown();
      let arrSchema = z.array(itemSchema);
      if (typeof schema.minItems === "number") {
        arrSchema = arrSchema.min(schema.minItems);
      }
      if (typeof schema.maxItems === "number") {
        arrSchema = arrSchema.max(schema.maxItems);
      }
      return arrSchema;
    }

    case "object": {
      const properties =
        schema.properties && typeof schema.properties === "object"
          ? (schema.properties as Record<string, Record<string, unknown>>)
          : {};
      const requiredList = Array.isArray(schema.required)
        ? (schema.required.filter((r) => typeof r === "string") as string[])
        : [];
      const requiredSet = new Set<string>(requiredList);

      if (
        Object.keys(properties).length === 0 &&
        schema.additionalProperties !== false
      ) {
        return z.record(z.unknown());
      }

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [propName, propDef] of Object.entries(properties)) {
        const propZod = compileJsonSchemaToZod(propDef);
        shape[propName] = requiredSet.has(propName)
          ? propZod
          : propZod.optional();
      }

      const objSchema = z.object(shape);
      if (schema.additionalProperties === false) {
        return objSchema.strict();
      }
      return objSchema.passthrough();
    }

    default:
      return z.unknown();
  }
}

export interface ContractValidationResult {
  valid: boolean;
  data?: unknown;
  errors?: string[];
}

export function validateCapabilityContract(
  schema: Record<string, unknown> | undefined,
  payload: unknown,
): ContractValidationResult {
  const zodSchema = compileJsonSchemaToZod(schema);
  const parsed = zodSchema.safeParse(payload);
  if (parsed.success) {
    return { valid: true, data: parsed.data };
  }
  return {
    valid: false,
    errors: parsed.error.issues.map(
      (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
    ),
  };
}
