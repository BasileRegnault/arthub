<?php

namespace App\Controller\Admin;

use App\Entity\Gallery;
use App\Entity\Artwork;
use App\Entity\User;
use App\Repository\GalleryRepository;
use App\Repository\ActivityLogRepository;
use App\Repository\GalleryDailyViewRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class GalleryDetailController extends AbstractController
{
    #[Route('/api/admin/galleries/detail/{id}', name: 'admin_gallery_detail', methods: ['GET'])]
    public function __invoke(
        int $id,
        GalleryRepository $galleryRepo,
        ActivityLogRepository $activityRepo,
        GalleryDailyViewRepository $viewRepo,
        EntityManagerInterface $em,
        Request $request
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $gallery = $galleryRepo->find($id);
        if (!$gallery) {
            return $this->json(['message' => 'Galerie introuvable'], 404);
        }

        $range = (int) $request->query->get('range', 30);
        $range = in_array($range, [7, 30, 90, 365], true) ? $range : 30;

        $from = (new \DateTimeImmutable('today'))->sub(
            new \DateInterval('P' . $range . 'D')
        );

        $to = new \DateTimeImmutable('today');

        $rawViewSeries = $viewRepo->getDailyViews($gallery->getId(), $from, $to);

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

        // Oeuvres contenues dans cette galerie (ManyToMany)
        $artworks = $gallery->getArtworks()->toArray();

        $totalViews = $viewRepo->countTotalViewsByGalleryIds([$gallery->getId()])[$gallery->getId()] ?? 0;

        // Historique des modifications (ActivityLog basé sur entityClass + entityId)
        $activityLogs = $activityRepo->findBy(
            ['entityClass' => Gallery::class, 'entityId' => $gallery->getId()],
            ['createdAt' => 'DESC']
        );

        return $this->json([
            'gallery' => $gallery,
            'artworks' => $artworks,
            'activityLogs' => $activityLogs,
            'viewSeries' => $viewSeries,
            'createdBy' => $gallery->getCreatedBy(),
            'totalViews' => $totalViews,
        ], 200, [], [
            'groups' => ['gallery:read', 'artwork:read', 'activity_log:read', 'user:read']
        ]);
    }
}
