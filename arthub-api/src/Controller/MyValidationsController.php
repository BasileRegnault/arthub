<?php

namespace App\Controller;

use App\Entity\Artist;
use App\Entity\Artwork;
use App\Entity\User;
use App\Enum\ValidationSubjectType;
use App\Repository\ValidationDecisionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_USER')]
class MyValidationsController extends AbstractController
{
    #[Route('/api/my-validations', name: 'my_validations', methods: ['GET'])]
    public function __invoke(
        Request $request,
        ValidationDecisionRepository $repo,
        EntityManagerInterface $em,
        NormalizerInterface $normalizer,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();

        $page = max(1, (int) $request->query->get('page', 1));
        $itemsPerPage = min(100, max(1, (int) $request->query->get('itemsPerPage', 50)));

        $typeRaw = $request->query->get('subjectType');
        $subjectType = match ($typeRaw) {
            'artist' => ValidationSubjectType::ARTIST,
            'artwork' => ValidationSubjectType::ARTWORK,
            null, '' => null,
            default => null
        };

        $pageData = $repo->paginateBySubmittedBy($user, $page, $itemsPerPage, $subjectType);
        $items = $pageData['items'];

        $artistIds = [];
        $artworkIds = [];
        foreach ($items as $d) {
            $t = $d->getSubjectType()?->value;
            if ($t === 'artist') $artistIds[] = $d->getSubjectId();
            if ($t === 'artwork') $artworkIds[] = $d->getSubjectId();
        }

        $subjectsByKey = [];
        if ($artistIds) {
            $artists = $em->getRepository(Artist::class)->findBy(['id' => array_values(array_unique($artistIds))]);
            foreach ($artists as $a) {
                $subjectsByKey['artist:' . $a->getId()] = $normalizer->normalize($a, 'json', [
                    'groups' => ['artist:read']
                ]);
            }
        }
        if ($artworkIds) {
            $artworks = $em->getRepository(Artwork::class)->findBy(['id' => array_values(array_unique($artworkIds))]);
            foreach ($artworks as $a) {
                $subjectsByKey['artwork:' . $a->getId()] = $normalizer->normalize($a, 'json', [
                    'groups' => ['artwork:read', 'artist:read']
                ]);
            }
        }

        $out = array_map(function ($d) use ($subjectsByKey) {
            $type = $d->getSubjectType()?->value ?? '';
            $sid = $d->getSubjectId();
            return [
                'id' => $d->getId(),
                'subjectType' => $type,
                'subjectId' => $sid,
                'status' => $d->getStatus()?->value,
                'reason' => $d->getReason(),
                'createdAt' => $d->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                'subject' => $subjectsByKey[$type . ':' . $sid] ?? null,
            ];
        }, $items);

        return $this->json([
            'items' => $out,
            'total' => $pageData['total'],
            'page' => $pageData['page'],
            'lastPage' => $pageData['lastPage'],
        ]);
    }
}
