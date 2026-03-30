<?php

namespace App\Repository;

use App\Entity\ArtworkDailyView;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ArtworkDailyView>
 */
class ArtworkDailyViewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ArtworkDailyView::class);
    }

    public function getDailyViews(int $artworkId, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        return $this->createQueryBuilder('v')
            ->select('v.viewDate AS date, COUNT(v.id) AS views')
            ->andWhere('v.artwork = :id')
            ->andWhere('v.viewDate BETWEEN :from AND :to')
            ->setParameter('id', $artworkId)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->groupBy('v.viewDate')
            ->orderBy('v.viewDate', 'ASC')
            ->getQuery()
            ->getArrayResult();
    }

    /**
     * @param int[] $artworkIds
     * @return array<int,int> [artworkId => totalViews]
     */
    public function countTotalViewsByArtworkIds(array $artworkIds): array
    {
        if ($artworkIds === []) {
            return [];
        }

        $rows = $this->createQueryBuilder('v')
            ->select('IDENTITY(v.artwork) AS artworkId, COUNT(v.id) AS totalViews')
            ->where('v.artwork IN (:ids)')
            ->setParameter('ids', $artworkIds)
            ->groupBy('artworkId')
            ->getQuery()
            ->getArrayResult();

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row['artworkId']] = (int) $row['totalViews'];
        }

        return $map;
    }
}
