<?php

namespace App\EventListener;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Event\PrePersistEventArgs;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\Events;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\KernelInterface;

#[AsDoctrineListener(event: Events::prePersist)]
#[AsDoctrineListener(event: Events::preUpdate)]
class EntityOwnershipListener
{
    public function __construct(
        private Security $security,
        private KernelInterface $kernel,
    ) {}

    public function prePersist(PrePersistEventArgs $args): void
    {
        $entity = $args->getObject();
        $em = $args->getObjectManager();

        $user = $this->resolveUser($em);
        if (!$user) {
            return;
        }

        if (method_exists($entity, 'setCreatedBy') && method_exists($entity, 'getCreatedBy')) {
            if ($entity->getCreatedBy() === null) {
                $entity->setCreatedBy($user);
            }
        }

        if (method_exists($entity, 'setUpdatedBy')) {
            $entity->setUpdatedBy($user);
        }
    }

    public function preUpdate(PreUpdateEventArgs $args): void
    {
        $entity = $args->getObject();
        $em = $args->getObjectManager();

        $user = $this->resolveUser($em);
        if (!$user) {
            return;
        }

        if (method_exists($entity, 'setUpdatedBy')) {
            $entity->setUpdatedBy($user);
        }
    }

    private function resolveUser(EntityManagerInterface $em): ?User
    {
        $user = $this->security->getUser();
        if ($user instanceof User) {
            return $user;
        }

        if ($this->kernel->getEnvironment() === 'dev') {
            $conn = $em->getConnection();

            $adminId = $conn->fetchOne(
                'SELECT id FROM "user" WHERE roles::jsonb @> :role::jsonb ORDER BY id ASC LIMIT 1',
                ['role' => json_encode(['ROLE_ADMIN'])]
            );

            if ($adminId) {
                return $em->getRepository(User::class)->find((int) $adminId);
            }
        }

        return null;
    }

}
