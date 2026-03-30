<?php

namespace App\Controller\Admin;

use App\Entity\Artist;
use App\Entity\Artwork;
use App\Enum\ValidationSubjectType;
use App\Repository\ValidationDecisionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

class ValidationListController extends AbstractController
{
    #[Route('/api/admin/validations', name: 'admin_validation_list', methods: ['GET'])]
    public function __invoke(
        Request $request,
        ValidationDecisionRepository $repo,
        EntityManagerInterface $em,
        NormalizerInterface $normalizer
    ): JsonResponse {
        //$this->denyAccessUnlessGranted('ROLE_ADMIN');

        $page = max(1, (int) $request->query->get('page', 1));
        $itemsPerPage = min(100, max(1, (int) $request->query->get('itemsPerPage', 10)));

        $typeRaw = $request->query->get('subjectType');
        $subjectType = match ($typeRaw) {
            'artist' => ValidationSubjectType::ARTIST,
            'artwork' => ValidationSubjectType::ARTWORK,
            null, '' => null,
            default => null
        };

        if ($typeRaw && !$subjectType) {
            return $this->json(['message' => 'Invalid subjectType'], 400);
        }

        $subjectId = $request->query->get('subjectId');
        $subjectId = ($subjectId !== null && $subjectId !== '') ? (int) $subjectId : null;

        $pageData = $repo->paginate($page, $itemsPerPage, $subjectType, $subjectId);
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
                    'groups' => ['artist:read', 'user:read']
                ]);
            }
        }

        if ($artworkIds) {
            $artworks = $em->getRepository(Artwork::class)->findBy(['id' => array_values(array_unique($artworkIds))]);
            foreach ($artworks as $a) {
                $subjectsByKey['artwork:' . $a->getId()] = $normalizer->normalize($a, 'json', [
                    'groups' => ['artwork:read', 'artist:read', 'user:read']
                ]);
            }
        }

        $out = array_map(function ($d) use ($normalizer, $subjectsByKey) {
            $type = $d->getSubjectType()?->value ?? '';
            $sid = $d->getSubjectId();
            $subject = $subjectsByKey[$type . ':' . $sid] ?? null;

            return [
                'id' => $d->getId(),
                'subjectType' => $type,
                'subjectId' => $sid,
                'status' => $d->getStatus()?->value,
                'reason' => $d->getReason(),
                'createdAt' => $d->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                'decidedBy' => $normalizer->normalize($d->getDecidedBy(), 'json', ['groups' => ['user:read']]),
                'submittedBy' => $d->getSubmittedBy()
                    ? $normalizer->normalize($d->getSubmittedBy(), 'json', ['groups' => ['user:read']])
                    : null,
                'subject' => $subject,
            ];
        }, $items);

        return $this->json([
            'items' => $out,
            'total' => $pageData['total'],
            'page' => $pageData['page'],
            'itemsPerPage' => $pageData['itemsPerPage'],
            'lastPage' => $pageData['lastPage'],
        ]);
    }
}