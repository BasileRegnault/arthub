<?php

namespace App\Repository;

use App\Entity\Artwork;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Artwork>
 */
class ArtworkRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Artwork::class);
    }

    public function countCreatedByMonth(): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT 
                DATE_FORMAT(created_at, "%Y-%m") AS month,
                COUNT(*) AS total
            FROM artwork
            GROUP BY month
            ORDER BY month ASC
        ';

        return $conn->executeQuery($sql)->fetchAllAssociative();
    }

    public function countDisplayStatus(): array
    {
        return $this->createQueryBuilder('a')
            ->select('a.isDisplay as status, COUNT(a.id) as total')
            ->groupBy('status')
            ->getQuery()
            ->getArrayResult();
    }

    public function countByStyle(): array
    {
        return $this->createQueryBuilder('a')
            ->select('a.style as style, COUNT(a.id) as total')
            ->groupBy('a.style')
            ->getQuery()
            ->getArrayResult();
    }


    //    /**
    //     * @return Artwork[] Retourne un tableau d'objets Artwork
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('a')
    //            ->andWhere('a.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('a.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?Artwork
    //    {
    //        return $this->createQueryBuilder('a')
    //            ->andWhere('a.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
