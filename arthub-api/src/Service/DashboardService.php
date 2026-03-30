<?php

namespace App\Service;

use App\Entity\Artwork;
use App\Entity\Gallery;
use App\Entity\Rating;
use App\Entity\User;
use App\Entity\UserLoginLog;
use Doctrine\DBAL\ParameterType;
use Doctrine\ORM\EntityManagerInterface;

class DashboardService
{
    public function __construct(private EntityManagerInterface $em) {}

    // ============================
    // Indicateurs clés (KPIs)
    // ============================
    public function getKPIs(int $daysConnections = 30): array
    {
        $from = (new \DateTimeImmutable())->modify(sprintf('-%d days', $daysConnections));

        return [
            'users'         => (int) $this->em->getRepository(User::class)->count([]),
            'artists'       => (int) $this->em->getRepository('App\Entity\Artist')->count([]),
            'artworks'      => (int) $this->em->getRepository(Artwork::class)->count([]),
            'ratings'       => (int) $this->em->getRepository(Rating::class)->count([]),
            'connections30d'=> (int) $this->em->getRepository(UserLoginLog::class)
                ->createQueryBuilder('u')
                ->select('COUNT(u.id)')
                ->where('u.createdAt >= :date')
                ->setParameter('date', $from)
                ->getQuery()
                ->getSingleScalarResult(),
        ];
    }

    // ============================
    // GRAPHIQUES (corrigés / robustes)
    // ============================

    /**
     * Œuvres créées par mois (sur N mois)
     */
    public function getArtworksByMonth(int $months = 12): array
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                COUNT(*)::int AS total
            FROM artwork
            WHERE created_at >= (CURRENT_DATE - (:months || ' months')::interval)
            GROUP BY date_trunc('month', created_at)
            ORDER BY date_trunc('month', created_at) ASC
        ";

        $result = $conn->executeQuery(
            $sql,
            ['months' => $months],
            ['months' => ParameterType::INTEGER]
        );

        return $result->fetchAllAssociative();
    }

    /**
     * Connexions par jour (sur N jours)
     */
    public function getConnectionsByDay(int $days = 30): array
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS total
            FROM user_login_log
            WHERE created_at >= (CURRENT_DATE - (:days || ' days')::interval)
            GROUP BY date_trunc('day', created_at)
            ORDER BY date_trunc('day', created_at) ASC
        ";

        $result = $conn->executeQuery(
            $sql,
            ['days' => $days],
            ['days' => ParameterType::INTEGER]
        );

        return $result->fetchAllAssociative();
    }

    /**
     * Notes par mois (sur N mois)
     */
    public function getRatingsOverTime(int $months = 12): array
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                COUNT(*)::int AS total
            FROM rating
            WHERE created_at >= (CURRENT_DATE - (:months || ' months')::interval)
            GROUP BY date_trunc('month', created_at)
            ORDER BY date_trunc('month', created_at) ASC
        ";

        $result = $conn->executeQuery(
            $sql,
            ['months' => $months],
            ['months' => ParameterType::INTEGER]
        );

        return $result->fetchAllAssociative();
    }

    /**
     * Œuvres affichées/masquées (plus simple & fiable)
     */
    public function getArtworksDisplayedStats(): array
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                SUM(CASE WHEN is_display = true THEN 1 ELSE 0 END)::int AS displayed,
                SUM(CASE WHEN is_display = false THEN 1 ELSE 0 END)::int AS hidden
            FROM artwork
        ";

        $result = $conn->executeQuery($sql)->fetchAssociative();

        return [
            'displayed' => (int) ($result['displayed'] ?? 0),
            'hidden'    => (int) ($result['hidden'] ?? 0),
        ];
    }

    public function getStylesStats(): array
    {
        // enum en base de données => regroupement possible
        $qb = $this->em->getRepository(Artwork::class)->createQueryBuilder('a');
        $qb->select('a.style AS style, COUNT(a.id) as total')
           ->groupBy('a.style')
           ->orderBy('total', 'DESC');

        return $qb->getQuery()->getArrayResult();
    }

    public function getNationalitiesStats(): array
    {
        // ⚠️ nationalité nullable -> on normalise "Inconnue"
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                COALESCE(NULLIF(TRIM(nationality), ''), 'Inconnue') AS nationality,
                COUNT(*)::int AS total
            FROM artist
            GROUP BY COALESCE(NULLIF(TRIM(nationality), ''), 'Inconnue')
            ORDER BY total DESC
        ";

        return $conn->executeQuery($sql)->fetchAllAssociative();
    }

    public function getGalleriesPublicPrivate(): array
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                is_public AS \"isPublic\",
                COUNT(*)::int AS total
            FROM gallery
            GROUP BY is_public
        ";

        return $conn->executeQuery($sql)->fetchAllAssociative();
    }

    // ============================
    // NOUVEAUX GRAPHIQUES : VUES
    // ============================

    public function getArtworkViewsByDay(int $days = 30): array
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                to_char(view_date, 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS total
            FROM artwork_daily_view
            WHERE view_date >= (CURRENT_DATE - (:days || ' days')::interval)
            GROUP BY view_date
            ORDER BY view_date ASC
        ";

        return $conn->executeQuery(
            $sql,
            ['days' => $days],
            ['days' => ParameterType::INTEGER]
        )->fetchAllAssociative();
    }

    public function getGalleryViewsByDay(int $days = 30): array
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                to_char(view_date, 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS total
            FROM gallery_daily_view
            WHERE view_date >= (CURRENT_DATE - (:days || ' days')::interval)
            GROUP BY view_date
            ORDER BY view_date ASC
        ";

        return $conn->executeQuery(
            $sql,
            ['days' => $days],
            ['days' => ParameterType::INTEGER]
        )->fetchAllAssociative();
    }

    // ============================
    // TABLEAUX "derniers" (corrigés)
    // ============================

    public function getLatestConnections(int $limit = 10): array
    {
        // userConnected nullable + ipHash et non ip
        return $this->em->createQueryBuilder()
            ->select([
                'ull.id AS id',
                'ull.createdAt AS createdAt',
                'ull.ipHash AS ip',
                'ull.userAgent AS userAgent',
                'ull.event AS event',
                'u.id AS userId',
                'u.username AS username',
                'u.email AS email'
            ])
            ->from(UserLoginLog::class, 'ull')
            ->leftJoin('ull.userConnected', 'u')
            ->orderBy('ull.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getArrayResult();
    }

    public function getLatestArtworks(int $limit = 10): array
    {
        return $this->em->createQueryBuilder()
            ->select([
                'a.id AS id',
                'a.title AS title',
                'a.isDisplay AS isDisplay',
                'a.createdAt AS createdAt',
                'u.id AS createdById',
                'u.username AS createdByUsername',
            ])
            ->from(Artwork::class, 'a')
            ->leftJoin('a.createdBy', 'u') // Jointure via BlameableTrait
            ->orderBy('a.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getArrayResult();
    }

    public function getLatestAdminActions(int $limit = 10): array
    {
        // Filtre ROLE_ADMIN sur jsonb + limite paramétrée
        $sql = '
            SELECT 
                a.id,
                a.action,
                a.entity_class,
                a.entity_id,
                a.created_at,
                u.username
            FROM activity_log a
            INNER JOIN "user" u ON a.user_connected_id = u.id
            WHERE u.roles @> :role::jsonb
            ORDER BY a.created_at DESC
            LIMIT :limit
        ';

        $conn = $this->em->getConnection();

        $result = $conn->executeQuery(
            $sql,
            [
                'role'  => json_encode(['ROLE_ADMIN']),
                'limit' => $limit,
            ],
            [
                'role'  => ParameterType::STRING,
                'limit' => ParameterType::INTEGER,
            ]
        );

        return $result->fetchAllAssociative();
    }

    // ============================
    // NOUVEAUX TABLEAUX UTILES
    // ============================

    /**
     * Top œuvres par vues sur N jours (basé sur artwork_daily_view)
     */
    public function getTopArtworksByViews(int $limit = 10, int $days = 30): array
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                a.id AS id,
                a.title AS title,
                COUNT(v.id)::int AS views
            FROM artwork_daily_view v
            INNER JOIN artwork a ON a.id = v.artwork_id
            WHERE v.view_date >= (CURRENT_DATE - (:days || ' days')::interval)
            GROUP BY a.id, a.title
            ORDER BY views DESC
            LIMIT :limit
        ";

        return $conn->executeQuery(
            $sql,
            ['days' => $days, 'limit' => $limit],
            ['days' => ParameterType::INTEGER, 'limit' => ParameterType::INTEGER]
        )->fetchAllAssociative();
    }

    /**
     * Top galeries par vues sur N jours (basé sur gallery_daily_view)
     */
    public function getTopGalleriesByViews(int $limit = 10, int $days = 30): array
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT
                g.id AS id,
                g.name AS name,
                COUNT(v.id)::int AS views
            FROM gallery_daily_view v
            INNER JOIN gallery g ON g.id = v.gallery_id
            WHERE v.view_date >= (CURRENT_DATE - (:days || ' days')::interval)
            GROUP BY g.id, g.name
            ORDER BY views DESC
            LIMIT :limit
        ";

        return $conn->executeQuery(
            $sql,
            ['days' => $days, 'limit' => $limit],
            ['days' => ParameterType::INTEGER, 'limit' => ParameterType::INTEGER]
        )->fetchAllAssociative();
    }

    /**
     * Dernières notes + info user/oeuvre (utile dashboard)
     */
    public function getLatestRatings(int $limit = 10): array
    {
        // Rating utilise le BlameableTrait => createdBy
        // Rating est lié à artwork (ManyToOne)
        return $this->em->createQueryBuilder()
            ->select([
                'r.id AS id',
                'r.score AS score',
                'r.comment AS comment',
                'r.createdAt AS createdAt',
                'a.id AS artworkId',
                'a.title AS artworkTitle',
                'u.id AS userId',
                'u.username AS username',
            ])
            ->from(Rating::class, 'r')
            ->leftJoin('r.artwork', 'a')
            ->leftJoin('r.createdBy', 'u')
            ->orderBy('r.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getArrayResult();
    }

    /**
     * Contenus à confirmer (ex : isConfirmCreate / toBeConfirmed)
     * -> Très utile pour un admin dashboard
     */
    public function getPendingValidationsCounts(): array
    {
        $conn = $this->em->getConnection();

        // Oeuvres
        $artworks = $conn->executeQuery("
            SELECT
                SUM(CASE WHEN to_be_confirmed = true THEN 1 ELSE 0 END)::int AS toBeConfirmed,
                SUM(CASE WHEN is_confirm_create = false THEN 1 ELSE 0 END)::int AS notConfirmed
            FROM artwork
        ")->fetchAssociative();

        // Artistes
        $artists = $conn->executeQuery("
            SELECT
                SUM(CASE WHEN to_be_confirmed = true THEN 1 ELSE 0 END)::int AS toBeConfirmed,
                SUM(CASE WHEN is_confirm_create = false THEN 1 ELSE 0 END)::int AS notConfirmed
            FROM artist
        ")->fetchAssociative();

        return [
            'artworks' => [
                'toBeConfirmed' => (int)($artworks['tobeconfirmed'] ?? $artworks['toBeConfirmed'] ?? 0),
                'notConfirmed'  => (int)($artworks['notconfirmed'] ?? $artworks['notConfirmed'] ?? 0),
            ],
            'artists' => [
                'toBeConfirmed' => (int)($artists['tobeconfirmed'] ?? $artists['toBeConfirmed'] ?? 0),
                'notConfirmed'  => (int)($artists['notconfirmed'] ?? $artists['notConfirmed'] ?? 0),
            ],
        ];
    }
}
