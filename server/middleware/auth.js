import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;


    // Aucun header Authorization
    if (!authHeader) {
      return res.status(401).json({
        error: "Token manquant",
      });
    }

    // Mauvais format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Format du token invalide",
      });
    }

    // Récupération du JWT
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Token manquant",
      });
    }

    // Vérification JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );


    // Vérification des informations essentielles
    if (!decoded.id) {
      return res.status(401).json({
        error: "Token invalide : identifiant utilisateur absent",
      });
    }

    // On place les informations dans req.user
    req.user = {
      id: decoded.id,
      role: decoded.role,
      cabinet_id: decoded.cabinet_id ?? null,
    };


    next();

  } catch (err) {

    console.error(
      "ERREUR JWT :",
      err.message
    );

    return res.status(401).json({
      error: "Token invalide ou expiré",
    });
  }
};


export const requireRole = (...roles) => {

  return (req, res, next) => {

    if (
      !req.user ||
      !roles.includes(req.user.role)
    ) {

      return res.status(403).json({
        error: "Accès refusé",
      });

    }

    next();
  };

};