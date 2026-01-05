const authorizePermissions = (requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.user?.permissions || [];

    // Normalize to array
    const permissionsArray = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    // Check if user has ANY required permission
    const hasPermission = permissionsArray.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: "Forbidden: Insufficient permissions"
      });
    }

    next();
  };
};

module.exports = authorizePermissions;
