const validConditions = ["new", "used"];
const validStatuses = ["active", "sold", "inactive"];

export const validateCreateListing = (req, res, next) => {
  if (!req.body || typeof req.body !== "object") {
    req.body = {};
  }

  const {
    category_id,
    title,
    description,
    price,
    condition,
    location,
  } = req.body;

  const errors = [];

  if (
    !Number.isSafeInteger(Number(category_id)) ||
    Number(category_id) <= 0
  ) {
    errors.push("category_id must be a positive integer.");
  }

  if (typeof title !== "string" || !title.trim()) {
    errors.push("title is required.");
  } else if (title.trim().length > 200) {
    errors.push("title must not exceed 200 characters.");
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    errors.push("description must be a string.");
  }

  const numericPrice = Number(price);

  if (
    price === undefined ||
    price === null ||
    price === "" ||
    !Number.isFinite(numericPrice) ||
    numericPrice < 0 ||
    !/^\d+(\.\d{1,2})?$/.test(String(price))
  ) {
    errors.push("price must be a non-negative amount with up to 2 decimals.");
  }

  if (!validConditions.includes(condition)) {
    errors.push("condition must be 'new' or 'used'.");
  }

  if (typeof location !== "string" || !location.trim()) {
    errors.push("location is required.");
  } else if (location.trim().length > 150) {
    errors.push("location must not exceed 150 characters.");
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors,
    });
  }

  req.body.category_id = Number(category_id);
  req.body.title = title.trim();
  req.body.price = numericPrice;
  req.body.location = location.trim();

  next();
};

export const validateUpdateListing = (req, res, next) => {
  if (!req.body || typeof req.body !== "object") {
    req.body = {};
  }

  const allowedFields = [
    "category_id",
    "title",
    "description",
    "price",
    "condition",
    "location",
    "status",
  ];

  const keys = Object.keys(req.body);

  if (!keys.length) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one field to update.",
    });
  }

  const unknownFields = keys.filter(
    (key) => !allowedFields.includes(key)
  );

  if (unknownFields.length) {
    return res.status(400).json({
      success: false,
      message: "Unsupported fields.",
      errors: unknownFields,
    });
  }

  const {
    category_id,
    title,
    description,
    price,
    condition,
    location,
    status,
  } = req.body;

  const errors = [];

  if (
    category_id !== undefined &&
    (!Number.isSafeInteger(Number(category_id)) ||
      Number(category_id) <= 0)
  ) {
    errors.push("category_id must be a positive integer.");
  }

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      errors.push("title cannot be empty.");
    } else if (title.trim().length > 200) {
      errors.push("title must not exceed 200 characters.");
    } else {
      req.body.title = title.trim();
    }
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    errors.push("description must be a string.");
  }

  if (price !== undefined) {
    if (
      price === null ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      !/^\d+(\.\d{1,2})?$/.test(String(price))
    ) {
      errors.push("price must be non-negative with up to 2 decimals.");
    } else {
      req.body.price = Number(price);
    }
  }

  if (
    condition !== undefined &&
    !validConditions.includes(condition)
  ) {
    errors.push("condition must be 'new' or 'used'.");
  }

  if (location !== undefined) {
    if (typeof location !== "string" || !location.trim()) {
      errors.push("location cannot be empty.");
    } else if (location.trim().length > 150) {
      errors.push("location must not exceed 150 characters.");
    } else {
      req.body.location = location.trim();
    }
  }

  if (status !== undefined && !validStatuses.includes(status)) {
    errors.push("status must be active, sold, or inactive.");
  }

  if (category_id !== undefined) {
    req.body.category_id = Number(category_id);
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors,
    });
  }

  next();
};

export const validateListingId = (req, res, next) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Listing ID must be a positive integer.",
    });
  }

  next();
};
