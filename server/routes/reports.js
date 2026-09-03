import express from "express";
import { db } from "../db.js";
import { requirePermission } from "../middleware/permissions.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission("reports"));
/*
|--------------------------------------------------------------------------
| GET /api/reports
|--------------------------------------------------------------------------
|
| Exemples :
|
| /api/reports?period=2026-08&userId=1&role=admin
|
| /api/reports?period=2026-08&userId=3&role=vendeur
|
| /api/reports?period=2026-08&userId=4&role=caissier
|
| Le cabinet est récupéré grâce à :
|
| APP_USER.cabinet_id
|        ↓
| APP_USER.id = SALE.user_id
|        ↓
| SALE.id = PAYMENT.sale_id
|
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {

  try {

    /*
    |--------------------------------------------------------------------------
    | PARAMÈTRES
    |--------------------------------------------------------------------------
    */

    const period =
      req.query.period ||
      new Date().toISOString().slice(0, 7);

    const userId =
      req.query.userId || null;

    const role =
      req.query.role || null;

    let cabinetId =
      req.query.cabinetId || null;


    /*
    |--------------------------------------------------------------------------
    | VÉRIFICATION DU FORMAT DE LA PÉRIODE
    |--------------------------------------------------------------------------
    */

    if (!/^\d{4}-\d{2}$/.test(period)) {

      return res.status(400).json({
        message:
          "Le paramètre period doit être au format YYYY-MM"
      });

    }


    /*
    |--------------------------------------------------------------------------
    | CALCUL DES DATES
    |--------------------------------------------------------------------------
    */

    const [year, month] = period.split("-").map(Number);

    const startDate =
      `${year}-${String(month).padStart(2, "0")}-01 00:00:00`;

    let nextYear = year;
    let nextMonth = month + 1;

    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear++;
    }

    const endDate =
      `${nextYear}-${String(nextMonth).padStart(2, "0")}-01 00:00:00`;


    /*
    |--------------------------------------------------------------------------
    | RÉCUPÉRER LE CABINET DE L'UTILISATEUR
    |--------------------------------------------------------------------------
    |
    | On ne cherche PAS s.cabinet_id car cette colonne n'existe pas.
    |
    | On utilise :
    |
    | app_user.id
    | app_user.cabinet_id
    |
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
    | CONDITIONS POUR LES VENTES
    |--------------------------------------------------------------------------
    |
    | SALE n'a PAS de cabinet_id.
    |
    | On passe donc par APP_USER :
    |
    | SALE.user_id = APP_USER.id
    |
    | puis :
    |
    | APP_USER.cabinet_id
    |
    */

    let saleWhere = `
      s.date >= ?
      AND s.date < ?
    `;

    let saleParams = [
      startDate,
      endDate
    ];


    /*
    |--------------------------------------------------------------------------
    | FILTRE CABINET
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
    | FILTRE VENDEUR / CAISSIER
    |--------------------------------------------------------------------------
    |
    | Pour un vendeur, on filtre par son user_id.
    |
    | Pour un caissier, on ne peut PAS filtrer par user_id
    | au niveau de PAYMENT car PAYMENT n'a pas de user_id.
    |
    | Les encaissements du caissier seront donc ceux du cabinet.
    |
    */

    if (role === "vendeur" && userId) {

      saleWhere += `
        AND s.user_id = ?
      `;

      saleParams.push(userId);

    }


    /*
    |--------------------------------------------------------------------------
    | CONDITIONS POUR LES PAIEMENTS
    |--------------------------------------------------------------------------
    */

    let paymentWhere = `
      p.date >= ?
      AND p.date < ?
    `;

    let paymentParams = [
      startDate,
      endDate
    ];


    /*
    |--------------------------------------------------------------------------
    | FILTRE CABINET POUR PAYMENT
    |--------------------------------------------------------------------------
    */

    if (cabinetId) {

      paymentWhere += `
        AND au.cabinet_id = ?
      `;

      paymentParams.push(cabinetId);

    }


    /*
    |--------------------------------------------------------------------------
    | POUR LE VENDEUR
    |--------------------------------------------------------------------------
    */

    if (role === "vendeur" && userId) {

      paymentWhere += `
        AND s.user_id = ?
      `;

      paymentParams.push(userId);

    }


    /* ========================================================================
       RAPPORT CAISSIER
       ======================================================================== */


    /*
    |--------------------------------------------------------------------------
    | TOTAL ENCAISSÉ
    |--------------------------------------------------------------------------
    */

    const [cashierSummaryRows] = await db.query(
      `
      SELECT

        COALESCE(
          SUM(p.paid),
          0
        ) AS totalCollected,


        COALESCE(
          SUM(
            CASE

              WHEN LOWER(
                TRIM(p.method)
              ) IN (
                'cash',
                'especes',
                'espèces',
                'espece',
                'espèce'
              )

              THEN p.paid

              ELSE 0

            END
          ),
          0
        ) AS cash,


        COALESCE(
          SUM(
            CASE

              WHEN LOWER(
                TRIM(p.method)
              ) IN (
                'momo',
                'mobile money',
                'mobile_money',
                'mtn',
                'mtn momo',
                'orange money',
                'orange',
                'wave'
              )

              THEN p.paid

              ELSE 0

            END
          ),
          0
        ) AS momo,


        COUNT(
          DISTINCT p.id
        ) AS transactions


      FROM payment p

      INNER JOIN sale s
        ON s.id = p.sale_id

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${paymentWhere}
      `,
      paymentParams
    );


    const cashierSummary =
      cashierSummaryRows[0] || {};


    /*
    |--------------------------------------------------------------------------
    | RESTE À ENCAISSER
    |--------------------------------------------------------------------------
    |
    | On prend les ventes de la période.
    |
    | Puis on soustrait TOUS les paiements associés à ces ventes.
    |
    */

    const [remainingRows] = await db.query(
      `
      SELECT

        COALESCE(
          SUM(
            GREATEST(
              s.total -
              COALESCE(
                (
                  SELECT SUM(p2.paid)

                  FROM payment p2

                  WHERE p2.sale_id = s.id
                ),
                0
              ),
              0
            )
          ),
          0
        ) AS remaining

      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${saleWhere}
      `,
      saleParams
    );


    const remaining =
      Number(
        remainingRows[0]?.remaining || 0
      );


    /*
    |--------------------------------------------------------------------------
    | ENCAISSEMENTS PAR JOUR
    |--------------------------------------------------------------------------
    |
    | IMPORTANT : MySQL en mode sql_mode=only_full_group_by (par défaut
    | sur Aiven) n'accepte une expression du SELECT comme "dépendante"
    | du GROUP BY que si elle est STRICTEMENT IDENTIQUE (même arbre
    | d'expression), et non simplement une fonction pure appliquée à
    | l'expression du GROUP BY. DATE_FORMAT(DATE(p.date), '%d/%m') dans
    | le SELECT n'est PAS reconnu comme dépendant de GROUP BY DATE(p.date)
    | même si c'est logiquement le cas : ça déclenche quand même
    | ER_WRONG_FIELD_WITH_GROUP. La seule solution fiable est d'utiliser
    | EXACTEMENT la même expression dans SELECT, GROUP BY et ORDER BY.
    | (Comme les dates de la requête sont toujours bornées à un seul
    | mois via WHERE, trier sur le texte '%d/%m' reste chronologique.)
    |
    */

    const [cashierDailyRows] = await db.query(
      `
      SELECT

        DATE_FORMAT(
          p.date,
          '%d/%m'
        ) AS day,


        COALESCE(
          SUM(
            CASE

              WHEN LOWER(
                TRIM(p.method)
              ) IN (
                'cash',
                'especes',
                'espèces',
                'espece',
                'espèce'
              )

              THEN p.paid

              ELSE 0

            END
          ),
          0
        ) AS cash,


        COALESCE(
          SUM(
            CASE

              WHEN LOWER(
                TRIM(p.method)
              ) IN (
                'momo',
                'mobile money',
                'mobile_money',
                'mtn',
                'mtn momo',
                'orange money',
                'orange',
                'wave'
              )

              THEN p.paid

              ELSE 0

            END
          ),
          0
        ) AS momo,


        COALESCE(
          SUM(p.paid),
          0
        ) AS total


      FROM payment p

      INNER JOIN sale s
        ON s.id = p.sale_id

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${paymentWhere}

      GROUP BY DATE_FORMAT(p.date, '%d/%m')

      ORDER BY DATE_FORMAT(p.date, '%d/%m') ASC
      `,
      paymentParams
    );


    const cashierDaily =
      cashierDailyRows.map((row) => ({

        day: row.day,

        cash: Number(row.cash || 0),

        momo: Number(row.momo || 0),

        total: Number(row.total || 0)

      }));



    /* ========================================================================
       RAPPORT VENDEUR
       ======================================================================== */


    /*
    |--------------------------------------------------------------------------
    | NOMBRE DE VENTES + CA + PANIER MOYEN
    |--------------------------------------------------------------------------
    */

    const [sellerSummaryRows] = await db.query(
      `
      SELECT

        COUNT(
          s.id
        ) AS sales,


        COALESCE(
          SUM(s.total),
          0
        ) AS revenue,


        CASE

          WHEN COUNT(s.id) > 0

          THEN
            COALESCE(
              SUM(s.total),
              0
            )
            /
            COUNT(s.id)

          ELSE 0

        END AS averageBasket


      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${saleWhere}
      `,
      saleParams
    );


    const sellerData =
      sellerSummaryRows[0] || {};


    /*
    |--------------------------------------------------------------------------
    | NOUVEAUX CLIENTS
    |--------------------------------------------------------------------------
    |
    | Ta table CLIENT ne possède pas forcément createdAt.
    |
    | On calcule donc les "nouveaux clients" à partir
    | de leur première vente.
    |
    */

    let newClientsWhere = `
      first_sale.first_date >= ?
      AND first_sale.first_date < ?
    `;

    let newClientsParams = [
      startDate,
      endDate
    ];


    if (cabinetId) {

      newClientsWhere += `
        AND first_sale.cabinet_id = ?
      `;

      newClientsParams.push(cabinetId);

    }


    if (role === "vendeur" && userId) {

      newClientsWhere += `
        AND first_sale.user_id = ?
      `;

      newClientsParams.push(userId);

    }


    const [newClientsRows] = await db.query(
      `
      SELECT

        COUNT(*) AS newClients

      FROM (

        SELECT

          s.client_id,

          MIN(s.date) AS first_date,

          MIN(au.cabinet_id) AS cabinet_id,

          MIN(s.user_id) AS user_id

        FROM sale s

        INNER JOIN app_user au
          ON au.id = s.user_id

        WHERE s.client_id IS NOT NULL

        GROUP BY s.client_id

      ) AS first_sale

      WHERE ${newClientsWhere}
      `,
      newClientsParams
    );


    const newClients =
      Number(
        newClientsRows[0]?.newClients || 0
      );


    /*
    |--------------------------------------------------------------------------
    | VENTES DU VENDEUR PAR JOUR
    |--------------------------------------------------------------------------
    |
    | Même remarque que pour cashierDailyRows : MySQL en mode
    | only_full_group_by exige une expression STRICTEMENT IDENTIQUE
    | entre SELECT, GROUP BY et ORDER BY — DATE_FORMAT(DATE(s.date), ...)
    | n'est pas reconnu comme dépendant de GROUP BY DATE(s.date).
    |
    */

    const [sellerDailyRows] = await db.query(
      `
      SELECT

        DATE_FORMAT(
          s.date,
          '%d/%m'
        ) AS day,


        COUNT(
          s.id
        ) AS sales,


        COALESCE(
          SUM(s.total),
          0
        ) AS revenue


      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${saleWhere}

      GROUP BY DATE_FORMAT(s.date, '%d/%m')

      ORDER BY DATE_FORMAT(s.date, '%d/%m') ASC
      `,
      saleParams
    );


    const sellerDaily =
      sellerDailyRows.map((row) => ({

        day: row.day,

        sales: Number(row.sales || 0),

        revenue: Number(row.revenue || 0)

      }));



    /* ========================================================================
       RAPPORT DIRECTEUR
       ======================================================================== */


    /*
    |--------------------------------------------------------------------------
    | CA TOTAL + NOMBRE DE VENTES
    |--------------------------------------------------------------------------
    */

    const directorSaleWhere = `
      s.date >= ?
      AND s.date < ?

      ${
        cabinetId
          ? "AND au.cabinet_id = ?"
          : ""
      }
    `;


    const directorSaleParams = [
      startDate,
      endDate
    ];


    if (cabinetId) {

      directorSaleParams.push(
        cabinetId
      );

    }


    const [directorSummaryRows] = await db.query(
      `
      SELECT

        COALESCE(
          SUM(s.total),
          0
        ) AS revenue,


        COUNT(
          s.id
        ) AS sales


      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${directorSaleWhere}
      `,
      directorSaleParams
    );


    const directorData =
      directorSummaryRows[0] || {};


    /*
    |--------------------------------------------------------------------------
    | TOTAL ENCAISSÉ DU CABINET
    |--------------------------------------------------------------------------
    */

    const directorPaymentWhere = `
      p.date >= ?
      AND p.date < ?

      ${
        cabinetId
          ? "AND au.cabinet_id = ?"
          : ""
      }
    `;


    const directorPaymentParams = [
      startDate,
      endDate
    ];


    if (cabinetId) {

      directorPaymentParams.push(
        cabinetId
      );

    }


    const [directorPaymentRows] = await db.query(
      `
      SELECT

        COALESCE(
          SUM(p.paid),
          0
        ) AS collected


      FROM payment p

      INNER JOIN sale s
        ON s.id = p.sale_id

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${directorPaymentWhere}
      `,
      directorPaymentParams
    );


    const collected =
      Number(
        directorPaymentRows[0]?.collected || 0
      );


    const revenue =
      Number(
        directorData.revenue || 0
      );


    const unpaid =
      Math.max(
        revenue - collected,
        0
      );


    /* ========================================================================
       TENDANCE MENSUELLE
       ======================================================================== */


    /*
    |--------------------------------------------------------------------------
    | On récupère les 6 derniers mois jusqu'à la période sélectionnée.
    |--------------------------------------------------------------------------
    */

    const selectedDate =
      new Date(
        year,
        month - 1,
        1
      );


    const firstTrendDate =
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() - 5,
        1
      );


    const trendStartDate =
      `${firstTrendDate.getFullYear()}-${String(
        firstTrendDate.getMonth() + 1
      ).padStart(2, "0")}-01 00:00:00`;


    const trendWhere = `
      s.date >= ?
      AND s.date < ?

      ${
        cabinetId
          ? "AND au.cabinet_id = ?"
          : ""
      }
    `;


    const trendParams = [
      trendStartDate,
      endDate
    ];


    if (cabinetId) {

      trendParams.push(
        cabinetId
      );

    }


    const [monthlyTrendRows] = await db.query(
      `
      SELECT

        DATE_FORMAT(
          s.date,
          '%Y-%m'
        ) AS month,


        COALESCE(
          SUM(s.total),
          0
        ) AS revenue


      FROM sale s

      INNER JOIN app_user au
        ON au.id = s.user_id

      WHERE ${trendWhere}

      GROUP BY DATE_FORMAT(
        s.date,
        '%Y-%m'
      )

      ORDER BY month ASC
      `,
      trendParams
    );


    const monthlyTrend =
      monthlyTrendRows.map((row) => ({

        month: row.month,

        revenue: Number(
          row.revenue || 0
        )

      }));



    /* ========================================================================
       RÉPONSE JSON
       ======================================================================== */


    res.json({

      period,

      cabinetId:
        cabinetId
          ? Number(cabinetId)
          : null,


      cashier: {

        summary: {

          totalCollected:
            Number(
              cashierSummary.totalCollected || 0
            ),

          cash:
            Number(
              cashierSummary.cash || 0
            ),

          momo:
            Number(
              cashierSummary.momo || 0
            ),

          transactions:
            Number(
              cashierSummary.transactions || 0
            ),

          remaining

        },


        daily:
          cashierDaily

      },


      seller: {

        summary: {

          sales:
            Number(
              sellerData.sales || 0
            ),

          revenue:
            Number(
              sellerData.revenue || 0
            ),

          averageBasket:
            Number(
              sellerData.averageBasket || 0
            ),

          newClients

        },


        daily:
          sellerDaily

      },


      director: {

        summary: {

          revenue,

          collected,

          unpaid,

          sales:
            Number(
              directorData.sales || 0
            )

        },


        monthlyTrend

      }

    });


  } catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "ERREUR RAPPORTS :"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );


    res.status(500).json({

      message:
        "Erreur lors de la récupération des rapports",

      error:
        error.message

    });

  }

});


export default router;