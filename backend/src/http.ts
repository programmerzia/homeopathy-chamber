import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';

export type AppEnv = { Variables: { chamberId: string } };

/** Parse and validate a JSON body; 400 with a readable message on failure. */
export async function parseJson<T extends z.ZodType>(c: Context, schema: T): Promise<z.output<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'invalid JSON body' });
  }
  const r = schema.safeParse(raw);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new HTTPException(400, { message: `${i.path.join('.') || 'body'}: ${i.message}` });
  }
  return r.data;
}
