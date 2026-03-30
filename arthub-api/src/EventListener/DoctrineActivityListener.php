<?php

namespace App\EventListener;

use App\Entity\ActivityLog;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Event\OnFlushEventArgs;
use Doctrine\ORM\Event\PostFlushEventArgs;
use Doctrine\ORM\Events;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\KernelInterface;

#[AsDoctrineListener(event: Events::onFlush)]
#[AsDoctrineListener(event: Events::postFlush)]
class DoctrineActivityListener
{
    private array $pendingInsertions = [];
    private ?User $resolvedUser = null;
    private bool $isFlushingLogs = false;

    public function __construct(
        private Security $security,
        private KernelInterface $kernel,
    ) {}

    public function onFlush(OnFlushEventArgs $args): void
    {
        $em = $args->getObjectManager();
        $uow = $em->getUnitOfWork();

        $user = $this->resolveUser($em);
        if (!$user) {
            return;
        }

        $this->resolvedUser = $user;

        foreach ($uow->getScheduledEntityInsertions() as $entity) {
            if ($entity instanceof ActivityLog) {
                continue;
            }
            if (!method_exists($entity, 'getId')) {
                continue;
            }
            $this->pendingInsertions[] = $entity;
        }

        foreach ($uow->getScheduledEntityUpdates() as $entity) {
            $this->createLog(
                'UPDATE',
                $entity,
                $em,
                $user,
                $uow->getEntityChangeSet($entity)
            );
        }

        foreach ($uow->getScheduledEntityDeletions() as $entity) {
            $this->createLog('DELETE', $entity, $em, $user);
        }
    }

    public function postFlush(PostFlushEventArgs $args): void
    {
        if ($this->isFlushingLogs) {
            return;
        }

        if (!$this->resolvedUser) {
            $this->pendingInsertions = [];
            return;
        }

        if (!$this->pendingInsertions) {
            return;
        }

        $em = $args->getObjectManager();

        $this->isFlushingLogs = true;

        foreach ($this->pendingInsertions as $entity) {
            if (!method_exists($entity, 'getId')) {
                continue;
            }

            $id = $entity->getId();
            if (!$id) {
                continue;
            }

            $log = new ActivityLog();
            $log->setAction('CREATE');
            $log->setEntityClass($entity::class);
            $log->setEntityId((int) $id);
            $log->setUserConnected($this->resolvedUser);

            $em->persist($log);
        }

        $this->pendingInsertions = [];

        $em->flush();

        $this->isFlushingLogs = false;
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

    private function createLog(
        string $action,
        object $entity,
        EntityManagerInterface $em,
        User $user,
        ?array $changes = null
    ): void {
        if ($entity instanceof ActivityLog) {
            return;
        }

        if (!method_exists($entity, 'getId')) {
            return;
        }

        $id = $entity->getId();
        if (!$id) {
            return;
        }

        $log = new ActivityLog();
        $log->setAction($action);
        $log->setEntityClass($entity::class);
        $log->setEntityId((int) $id);
        $log->setUserConnected($user);
        $log->setOldValues($changes ? array_column($changes, 0) : null);
        $log->setNewValues($changes ? array_column($changes, 1) : null);

        $em->persist($log);

        $em->getUnitOfWork()->computeChangeSet(
            $em->getClassMetadata(ActivityLog::class),
            $log
        );
    }
}
