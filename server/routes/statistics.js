import express from "express";
import { db } from "../db.js";
import { requirePermission } from "../middleware/permissions.js";
import { requireAuth } from "../middleware/auth.js";


const router = express.Router();
router.use(requireAuth);
router.use(requirePermission("statistics"));
/*
|--------------------------------------------------------------------------
| GET /api/statistics
|--------------------------------------------------------------------------
|
| Exemple :
|
| /api/statistics?userId=1&role=admin
|
| Le cabinet est récupéré via :
|
| APP_USER
|    ↓
| SALE.user_id
|    ↓
| CLIENT
|
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId || null;
    const role = req.query.role || null;

    let cabinetId = req.query.cabinetId || null;

    /*
    |--------------------------------------------------------------------------
    | Récupérer le cabinet de l'utilisateur
    |--------------------------------------------------------------------------
    */

    if (!cabinetId && userId) {
      const [userRows] = await db.query(
        `
        SELECT cabinet_id
        FROM app_user
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
      );

      if (userRows.length > 0) {
        cabinetId = userRows[0].cabinet_id;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CONDITIONS COMMUNES SUR LES VENTES
    |--------------------------------------------------------------------------
    */

    let saleWhere = `1 = 1`;
    let saleParams = [];

    /*
    |--------------------------------------------------------------------------
    | Filtre cabinet
    |--------------------------------------------------------------------------
    */

    if (cabinetId) {
      saleWhere += `
        AND au.cabinet_id = ?
      `;

      saleParams.push(cabinetId);
    }

    /*
    |--------------------------------------------------------------------------
    | Vendeur : uniquement ses ventes
    |--------------------------------------------------------------------------
    */

    if (role === "vendeur" && userId) {
      saleWhere += `
        AND s.user_id = ?
      `;

      saleParams.push(userId);
    }

    /*
    |--------------------------------------------------------------------------
    | 1. CHIFFRE D'AFFAIRES MENSUEL
    |--------------------------------------------------------------------------
    |
    | IMPORTANT : le SELECT contient 3 expressions basées sur s.date
    | (YEAR, MONTH, DATE_FORMAT). Toutes les trois doivent apparaître
    | dans le GROUP BY, sinon MySQL en mode sql_mode=only_full_group_by
    | (par défaut sur Aiven) rejette la requête avec ER_WRONG_FIELD_WITH_GROUP.
    |
    */

    const [monthlyRevenueRows] = await db.query(
      `
      SELECT

        YEAR(s.date) AS year,

        MONTH(s.date) AS monthNumber,

        DATE_FORMAT(
          s.date,
          '%b'
        ) AS month,

        COALESCE(
          SUM(s.total),
          0
        ) AS revenue

      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${saleWhere}

      GROUP BY
        YEAR(s.date),
        MONTH(s.date),
        DATE_FORMAT(s.date, '%b')

      ORDER BY
        YEAR(s.date),
        MONTH(s.date)
      `,
      saleParams
    );

    const monthlyRevenue = monthlyRevenueRows.map((row) => ({
      month: row.month,
      year: Number(row.year),
      monthNumber: Number(row.monthNumber),
      revenue: Number(row.revenue || 0),
    }));

    /*
    |--------------------------------------------------------------------------
    | 2. VENTES PAR SEXE
    |--------------------------------------------------------------------------
    */

    const [genderRows] = await db.query(
      `
      SELECT

        COALESCE(
          NULLIF(
            TRIM(c.sex),
            ''
          ),
          'unknown'
        ) AS sex,

        COUNT(s.id) AS count

      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      INNER JOIN client c
        ON c.id = s.client_id

      WHERE ${saleWhere}

      GROUP BY
        COALESCE(
          NULLIF(
            TRIM(c.sex),
            ''
          ),
          'unknown'
        )

      ORDER BY count DESC
      `,
      saleParams
    );

    const salesByGender = genderRows.map((row) => ({
      sex: row.sex,
      count: Number(row.count || 0),
    }));

    /*
    |--------------------------------------------------------------------------
    | 3. VENTES PAR TRANCHE D'ÂGE
    |--------------------------------------------------------------------------
    */

    const [ageRows] = await db.query(
      `
      SELECT

        CASE

          WHEN c.age IS NULL THEN 'unknown'

          WHEN c.age <= 18 THEN '0-18'

          WHEN c.age BETWEEN 19 AND 30 THEN '19-30'

          WHEN c.age BETWEEN 31 AND 45 THEN '31-45'

          WHEN c.age BETWEEN 46 AND 60 THEN '46-60'

          ELSE '60+'

        END AS age,

        COUNT(s.id) AS count

      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      INNER JOIN client c
        ON c.id = s.client_id

      WHERE ${saleWhere}

      GROUP BY
        CASE

          WHEN c.age IS NULL THEN 'unknown'

          WHEN c.age <= 18 THEN '0-18'

          WHEN c.age BETWEEN 19 AND 30 THEN '19-30'

          WHEN c.age BETWEEN 31 AND 45 THEN '31-45'

          WHEN c.age BETWEEN 46 AND 60 THEN '46-60'

          ELSE '60+'

        END

      ORDER BY
        CASE age

          WHEN '0-18' THEN 1
          WHEN '19-30' THEN 2
          WHEN '31-45' THEN 3
          WHEN '46-60' THEN 4
          WHEN '60+' THEN 5
          ELSE 6

        END
      `,
      saleParams
    );

    const salesByAge = ageRows.map((row) => ({
      age: row.age,
      count: Number(row.count || 0),
    }));

    /*
    |--------------------------------------------------------------------------
    | 4. VENTES PAR VILLE
    |--------------------------------------------------------------------------
    */

    const [cityRows] = await db.query(
      `
      SELECT

        COALESCE(
          NULLIF(
            TRIM(c.city),
            ''
          ),
          'Non renseignée'
        ) AS city,

        COUNT(s.id) AS count

      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      INNER JOIN client c
        ON c.id = s.client_id

      WHERE ${saleWhere}

      GROUP BY
        COALESCE(
          NULLIF(
            TRIM(c.city),
            ''
          ),
          'Non renseignée'
        )

      ORDER BY count DESC

      LIMIT 10
      `,
      saleParams
    );

    const salesByCity = cityRows.map((row) => ({
      city: row.city,
      count: Number(row.count || 0),
    }));

    /*
    |--------------------------------------------------------------------------
    | 5. VENTES PAR DISTRICT
    |--------------------------------------------------------------------------
    */

    const [districtRows] = await db.query(
      `
      SELECT

        COALESCE(
          NULLIF(
            TRIM(c.district),
            ''
          ),
          'Non renseigné'
        ) AS district,

        COUNT(s.id) AS count

      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      INNER JOIN client c
        ON c.id = s.client_id

      WHERE ${saleWhere}

      GROUP BY
        COALESCE(
          NULLIF(
            TRIM(c.district),
            ''
          ),
          'Non renseigné'
        )

      ORDER BY count DESC

      LIMIT 10
      `,
      saleParams
    );

    const salesByDistrict = districtRows.map((row) => ({
      district: row.district,
      count: Number(row.count || 0),
    }));

    /*
    |--------------------------------------------------------------------------
    | 6. STATISTIQUES GÉNÉRALES
    |--------------------------------------------------------------------------
    */

    const [summaryRows] = await db.query(
      `
      SELECT

        COUNT(s.id) AS totalSales,

        COALESCE(
          SUM(s.total),
          0
        ) AS totalRevenue,

        COUNT(
          DISTINCT s.client_id
        ) AS totalClients

      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${saleWhere}
      `,
      saleParams
    );

    const summary = summaryRows[0] || {};

    /*
    |--------------------------------------------------------------------------
    | 7. PRODUITS
    |--------------------------------------------------------------------------
    |
    | ATTENTION :
    |
    | Ta table SALE actuelle ne possède pas de colonne items
    | ni de table sale_item.
    |
    | On ne peut donc pas calculer correctement les produits
    | réellement vendus à partir de la structure actuelle.
    |
    |--------------------------------------------------------------------------
    */

    const topProducts = [];

    /*
    |--------------------------------------------------------------------------
    | RÉPONSE
    |--------------------------------------------------------------------------
    */

    res.json({
      cabinetId: cabinetId ? Number(cabinetId) : null,

      summary: {
        totalSales: Number(summary.totalSales || 0),
        totalRevenue: Number(summary.totalRevenue || 0),
        totalClients: Number(summary.totalClients || 0),
      },

      monthlyRevenue,

      salesByGender,

      salesByAge,

      salesByCity,

      salesByDistrict,

      topProducts,
    });
  } catch (error) {
    console.error("=================================");
    console.error("ERREUR STATISTIQUES :");
    console.error(error);
    console.error("=================================");

    res.status(500).json({
      message: "Erreur lors de la récupération des statistiques",
      error: error.message,
    });
  }
});

export default router;