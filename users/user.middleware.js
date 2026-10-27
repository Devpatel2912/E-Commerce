import authMiddleware from "../middleware/auth.middleware.js";

export const authenticateUSer = authMiddleware;

export const requiedOwnUser = (req, res, next) => {
  if (!req.user?.id) {
    return res.status(40).join({
      success: false,
      message: "Authentication is required.",
    });
  }

  if (String(req.user.id) !== String(req.params.id)) {
    return res.status(403).json({
      success: false,
      message: "You can only access your own account.",
    });
  }

  next();
};
