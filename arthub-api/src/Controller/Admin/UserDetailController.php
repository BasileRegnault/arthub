<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Repository\GalleryRepository;
use App\Repository\RatingRepository;
use App\Repository\ArtworkRepository;
use App\Repository\ArtistRepository;
use App\Repository\UserLoginLogRepository;
use App\Repository\ActivityLogRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

#[Route('/api/admin/users')]
class UserDetailController extends AbstractController
{
    #[Route('/detail/{id}', name: 'admin_user_detail', methods: ['GET'])]
    public function detail(
        int $id,
        UserRepository $userRepository,
        GalleryRepository $galleryRepository,
        RatingRepository $ratingRepository,
        ArtworkRepository $artworkRepository,
        ArtistRepository $artistRepository,
        UserLoginLogRepository $loginLogRepository,
        ActivityLogRepository $activityLogRepository,
        SerializerInterface $serializer
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $user = $userRepository->find($id);
        if (!$user) {
            throw new NotFoundHttpException('Utilisateur introuvable');
        }

        $data = [
            'user' => $user,

            // Tout est basé sur createdBy maintenant
            'galleries' => $galleryRepository->findBy(['createdBy' => $user], ['createdAt' => 'DESC']),
            'ratings' => $ratingRepository->findBy(['createdBy' => $user], ['id' => 'DESC']),

            // ✅ Ajout
            'artworks' => $artworkRepository->findBy(['createdBy' => $user], ['createdAt' => 'DESC']),
            'artists' => $artistRepository->findBy(['createdBy' => $user], ['createdAt' => 'DESC']),

            'loginLogs' => $loginLogRepository->findBy(
                ['userConnected' => $user],
                ['createdAt' => 'DESC'],
                50
            ),
            'activityLogs' => $activityLogRepository->findBy(
                ['userConnected' => $user],
                ['createdAt' => 'DESC'],
                100
            ),
        ];

        return new JsonResponse(
            $serializer->serialize($data, 'json', ['groups' => ['user:detail']]),
            200,
            [],
            true
        );
    }
}
