import { body, validationResult } from "express-validator";

export const validateShortUrl = [
  body("originalUrl")
    .notEmpty()
    .withMessage("URL is required")
    .isURL()
    .withMessage("Invalid URL format"),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    next();
  },
];