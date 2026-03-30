<?php

namespace App\Repository;

use App\Entity\ValidationDecision;
use App\Enum\ValidationSubjectType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;

class ValidationDecisionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ValidationDecision::class);
    }

    public function paginate(
        int $page,
        int $itemsPerPage,
        ?ValidationSubjectType $subjectType = null,
        ?int $subjectId = null
    ): array {
        $qb = $this->createQueryBuilder('v')
            ->orderBy('v.createdAt', 'DESC');

        if ($subjectType) {
            $qb->andWhere('v.subjectType = :t')->setParameter('t', $subjectType);
        }
        if ($subjectId) {
            $qb->andWhere('v.subjectId = :sid')->setParameter('sid', $subjectId);
        }

        $qb->setFirstResult(($page - 1) * $itemsPerPage)
           ->setMaxResults($itemsPerPage);

        $paginator = new Paginator($qb, true);
        $total = count($paginator);

        return [
            'items' => iterator_to_array($paginator),
            'total' => $total,
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'lastPage' => (int) max(1, (int) ceil($total / $itemsPerPage)),
        ];
    }
}
