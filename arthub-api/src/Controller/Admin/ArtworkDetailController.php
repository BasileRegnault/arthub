<?php

namespace App\Controller\Admin;

use App\Entity\Artwork;
use App\Entity\Gallery;
use App\Entity\Rating;
use App\Entity\ActivityLog;
use App\Repository\ArtworkRepository;
use App\Repository\ActivityLogRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use App\Repository\ArtworkDailyViewRepository;
use App\Repository\GalleryDailyViewRepository;

class ArtworkDetailController extends AbstractController
{
    #[Route('/api/admin/artworks/detail/{id}', name: 'admin_artwork_detail', methods: ['GET'])]
    public function __invoke(
        int $id,
        ArtworkRepository $artworkRepo,
        ActivityLogRepository $activityRepo,
        ArtworkDailyViewRepository $artworkViewRepo,
        GalleryDailyViewRepository $galleryViewRepo,
        EntityManagerInterface $em,
        Request $request
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $artwork = $artworkRepo->find($id);
        if (!$artwork) {
            return $this->json(['message' => 'Œuvre introuvable'], 404);
        }

        $range = (int) $request->query->get('range', 30);
        $range = in_array($range, [7, 30, 90, 365], true) ? $range : 30;

        $from = (new \DateTimeImmutable('today'))->sub(
            new \DateInterval('P' . $range . 'D')
        );

        $to = new \DateTimeImmutable('today');

        $rawViewSeries = $artworkViewRepo->getDailyViews($artwork->getId(), $from, $to);

        $viewSeries = array_map(static function (array $row): array {
            $dateValue = $row['date'] ?? null;

            if ($dateValue instanceof \DateTimeInterface) {
                $formatted = $dateValue->format('d/m/Y');
            } elseif (is_string($dateValue) && $dateValue !== '') {
                $formatted = (new \DateTimeImmutable($dateValue))->format('d/m/Y');
            } else {
                $formatted = '';
            }

            return [
                'date' => $formatted,
                'views' => (int) ($row['views'] ?? 0),
            ];
        }, $rawViewSeries);

        // Galeries contenant cette oeuvre (ManyToMany)
        $galleries = $artwork->getGalleries()->toArray();

        $artworkTotalViews = $artworkViewRepo->countTotalViewsByArtworkIds([$id])[$id] ?? 0;

        // Notes associées
        $ratings = $artwork->getRatings()->toArray();

        // Historique des modifications (ActivityLog basé sur entityClass + entityId)
        $activityLogs = $activityRepo->findBy(
            ['entityClass' => Artwork::class, 'entityId' => $artwork->getId()],
            ['createdAt' => 'DESC']
        );

        return $this->json([
            'artwork' => $artwork,
            'artist' => $artwork->getArtist(),
            'galleries' => $galleries,
            'ratings' => $ratings,
            'activityLogs' => $activityLogs,
            'viewSeries' => $viewSeries,
            'artworkTotalViews' => $artworkTotalViews,
        ], 200, [], [
            'groups' => ['artwork:read', 'artist:read', 'gallery:read', 'rating:read', 'activity_log:read']
        ]);
    }
}