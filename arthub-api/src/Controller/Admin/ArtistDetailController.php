<?php

namespace App\Controller\Admin;

use App\Entity\Artist;
use App\Entity\ActivityLog;
use App\Repository\ArtistRepository;
use App\Repository\ArtworkRepository;
use App\Repository\ActivityLogRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

#[Route('/api/admin/artists')]
class ArtistDetailController extends AbstractController
{
    #[Route('/detail/{id}', name: 'admin_artist_detail', methods: ['GET'])]
    public function detail(
        int $id,
        ArtistRepository $artistRepository,
        ArtworkRepository $artworkRepository,
        ActivityLogRepository $activityLogRepository,
        SerializerInterface $serializer
    ): JsonResponse {
        // $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $artist = $artistRepository->find($id);
        if (!$artist) {
            throw new NotFoundHttpException('Artiste introuvable');
        }

        // ✅ artworks liés à l'artiste
        $artworks = $artworkRepository->findBy(
            ['artist' => $artist],
            ['createdAt' => 'DESC']
        );

        // ✅ activity logs : pas de relation => query sur entityClass + entityId
        $activityLogs = $activityLogRepository->findBy(
            [
                'entityClass' => Artist::class,
                'entityId' => $artist->getId(),
            ],
            ['createdAt' => 'DESC'],
            200
        );

        $data = [
            'artist' => $artist,
            'artworks' => $artworks,
            'activityLogs' => $activityLogs,
        ];

        return new JsonResponse(
            $serializer->serialize($data, 'json', [
                'groups' => [
                    'artist:read',
                    'artwork:read',
                    'activity_log:read',
                    'user:read', // nécessaire si userConnected ou createdBy est sérialisé
                ]
            ]),
            200,
            [],
            true
        );
    }
}
