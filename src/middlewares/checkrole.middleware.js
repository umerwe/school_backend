import { ApiError } from "../utils/ApiError.js";

export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ApiError(403,`Access denied: Please login as ${roles}`));
    }
    next();
  };
};

