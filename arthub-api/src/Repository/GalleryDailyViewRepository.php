<?php

namespace App\Repository;

use App\Entity\GalleryDailyView;
use App\Entity\Gallery;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<GalleryDailyView>
 */
class GalleryDailyViewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GalleryDailyView::class);
    }

    public function getDailyViews(int $galleryId, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        return $this->createQueryBuilder('v')
            ->select('v.viewDate AS date', 'COUNT(v.id) AS views')
            ->where('v.gallery = :id')
            ->andWhere('v.viewDate BETWEEN :from AND :to')
            ->setParameter('id', $galleryId)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->groupBy('v.viewDate')
            ->orderBy('v.viewDate', 'ASC')
            ->getQuery()
            ->getArrayResult();
    }

    /**
     * @param int[] $galleryIds
     * @return array<int,int> [galleryId => totalViews]
     */
    public function countTotalViewsByGalleryIds(array $galleryIds): array
    {
        if ($galleryIds === []) {
            return [];
        }

        $rows = $this->createQueryBuilder('v')
            ->select('IDENTITY(v.gallery) AS galleryId, COUNT(v.id) AS totalViews')
            ->where('v.gallery IN (:ids)')
            ->setParameter('ids', $galleryIds)
            ->groupBy('galleryId')
            ->getQuery()
            ->getArrayResult();

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row['galleryId']] = (int) $row['totalViews'];
        }

        return $map;
    }
}
