<?php

namespace App\Controller\Admin;

use App\Entity\Artist;
use App\Entity\Artwork;
use App\Entity\User;
use App\Entity\ValidationDecision;
use App\Enum\ValidationStatus;
use App\Enum\ValidationSubjectType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

class ValidateController extends AbstractController
{
    #[Route('/api/admin/validate/{type}/{id}', name: 'admin_validate_subject', methods: ['POST'])]
    public function __invoke(
        string $type,
        int $id,
        Request $request,
        EntityManagerInterface $em,
        NormalizerInterface $normalizer,
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $subjectType = match ($type) {
            'artist' => ValidationSubjectType::ARTIST,
            'artwork' => ValidationSubjectType::ARTWORK,
            default => null
        };

        if (!$subjectType) {
            return $this->json(['message' => 'Type invalide'], 400);
        }

        $payload = json_decode($request->getContent() ?: '{}', true);

        $statusRaw = (string) ($payload['status'] ?? '');
        $status = match ($statusRaw) {
            'approved' => ValidationStatus::APPROVED,
            'rejected' => ValidationStatus::REJECTED,
            default => null
        };

        if (!$status) {
            return $this->json(['message' => 'Statut invalide'], 400);
        }

        $reason = isset($payload['reason']) ? trim((string) $payload['reason']) : null;
        if ($reason === '') $reason = null;

        $subject = match ($subjectType) {
            ValidationSubjectType::ARTIST => $em->getRepository(Artist::class)->find($id),
            ValidationSubjectType::ARTWORK => $em->getRepository(Artwork::class)->find($id),
        };

        if (!$subject) {
            return $this->json(['message' => 'Élément introuvable'], 404);
        }

        $admin = $this->getUser();

        if (!$admin instanceof User) {
            return $this->json(['message' => 'Administrateur introuvable'], 500);
        }

        if ($subject instanceof Artist) {
            $subject->setIsConfirmCreate($status === ValidationStatus::APPROVED);
            $subject->setToBeConfirmed(false);
        }

        if ($subject instanceof Artwork) {
            $subject->setIsConfirmCreate($status === ValidationStatus::APPROVED);
            $subject->setToBeConfirmed(false);

            if ($status === ValidationStatus::REJECTED) {
                $subject->setIsDisplay(false);
            }
        }

        $decision = (new ValidationDecision())
            ->setSubjectType($subjectType)
            ->setSubjectId($id)
            ->setStatus($status)
            ->setDecidedBy($admin)
            ->setSubmittedBy(method_exists($subject, 'getCreatedBy') ? $subject->getCreatedBy() : null)
            ->setReason($reason);

        $em->persist($decision);
        $em->flush();

        $subjectGroups = $subjectType === ValidationSubjectType::ARTIST
            ? ['artist:read', 'user:read']
            : ['artwork:read', 'artist:read', 'user:read'];

        $subjectData = $normalizer->normalize($subject, 'json', ['groups' => $subjectGroups]);
        $decisionData = [
            'id' => $decision->getId(),
            'subjectType' => $decision->getSubjectType()?->value,
            'subjectId' => $decision->getSubjectId(),
            'status' => $decision->getStatus()?->value,
            'reason' => $decision->getReason(),
            'createdAt' => $decision->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'decidedBy' => $normalizer->normalize($decision->getDecidedBy(), 'json', ['groups' => ['user:read']]),
            'submittedBy' => $decision->getSubmittedBy()
                ? $normalizer->normalize($decision->getSubmittedBy(), 'json', ['groups' => ['user:read']])
                : null,
            'subject' => $subjectData
        ];

        return $this->json($decisionData);
    }
}
