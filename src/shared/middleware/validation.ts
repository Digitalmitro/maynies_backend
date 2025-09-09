// src/shared/middleware/validate.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema } from 'zod';

export const validate = <T>(
    schema: ZodSchema<T>,
    source: "body" | "query" | "params" = "body"
  ): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const result = schema.safeParse(req[source]);
  
      if (!result.success) {
        const errors = result.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        res.status(400).json({ errors });
        return;
      }
  
      // ✅ Instead of overwriting, assign back the validated fields
      if (source === "query" || source === "params") {
        Object.assign(req[source], result.data);
      } else {
        req.body = result.data; // body is mutable
      }
  
      next();
    };
  };
  
