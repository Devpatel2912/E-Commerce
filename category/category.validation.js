const validateCategory = (req, res, next) => {
  const { name, description } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Category name is required.",
    });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: "Category name cannot exceed 100 characters.",
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be a string.",
    });
  }

  if (typeof description === "string" && description.length > 5000) {
    return res.status(400).json({
      success: false,
      message: "Description cannot exceed 5000 characters.",
    });
  }

  next();
};

const validateCategoryUpdate = (req, res, next) => {
  const { name, description } = req.body;

  if (name === undefined && description === undefined) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one field to update.",
    });
  }

  if (
    name !== undefined &&
    (typeof name !== "string" || !name.trim() || name.trim().length > 100)
  ) {
    return res.status(400).json({
      success: false,
      message: "Name must be a non-empty string of at most 100 characters.",
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be a string or null.",
    });
  }

  if (typeof description === "string" && description.length > 5000) {
    return res.status(400).json({
      success: false,
      message: "Description cannot exceed 5000 characters.",
    });
  }

  next();
};

const validateCategoryId = (req, res, next) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({
      success: false,
      message: "Invalid category ID.",
    });
  }

  next();
};

export { validateCategory, validateCategoryUpdate, validateCategoryId };
