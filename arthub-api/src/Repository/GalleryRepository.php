<?php

namespace App\Repository;

use App\Entity\Gallery;
use App\Entity\GalleryDailyView;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Gallery>
 */
class GalleryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Gallery::class);
    }

    public function getTotalViews(Gallery $gallery): int
    {
        return $this->createQueryBuilder('v')
            ->select('COUNT(v.id)')
            ->from(GalleryDailyView::class, 'v')
            ->where('v.gallery = :gallery')
            ->setParameter('gallery', $gallery)
            ->getQuery()
            ->getSingleScalarResult();
    }

    //    /**
    //     * @return Gallery[] Retourne un tableau d'objets Gallery
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('g')
    //            ->andWhere('g.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('g.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?Gallery
    //    {
    //        return $this->createQueryBuilder('g')
    //            ->andWhere('g.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
