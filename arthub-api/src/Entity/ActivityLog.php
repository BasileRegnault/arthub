<?php

namespace App\Entity;

use App\Repository\ActivityLogRepository;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: ActivityLogRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    normalizationContext: ['groups' => ['activity_log:read']],
    denormalizationContext: ['groups' => ['activity_log:write']],
    operations: [
        new \ApiPlatform\Metadata\GetCollection(),
        new \ApiPlatform\Metadata\Get(),
        new \ApiPlatform\Metadata\Post()
    ]
)]
class ActivityLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['activity_log:read', 'user:detail'])]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    #[Groups(['activity_log:read', 'activity_log:write', 'user:detail'])]
    private ?string $action = null;

    #[ORM\Column(length: 255)]
    #[Groups(['activity_log:read', 'activity_log:write', 'user:detail'])]
    private ?string $entityClass = null;

    #[ORM\Column]
    #[Groups(['activity_log:read', 'activity_log:write', 'user:detail'])]
    private ?int $entityId = null;

    #[ORM\ManyToOne(inversedBy: 'activityLogs')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['activity_log:read', 'activity_log:write', 'user:detail'])]
    private ?User $userConnected = null;

    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups(['activity_log:read', 'activity_log:write', 'user:detail'])]
    private ?array $oldValues = null;

    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups(['activity_log:read', 'activity_log:write', 'user:detail'])]
    private ?array $newValues = null;

    #[ORM\Column]
    #[Groups(['activity_log:read', 'user:detail'])]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        if (!$this->createdAt) {
            $this->createdAt = new \DateTimeImmutable();
        }
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getAction(): ?string
    {
        return $this->action;
    }

    public function setAction(string $action): static
    {
        $this->action = $action;
        return $this;
    }

    public function getEntityClass(): ?string
    {
        return $this->entityClass;
    }

    public function setEntityClass(string $entityClass): static
    {
        $this->entityClass = $entityClass;
        return $this;
    }

    public function getEntityId(): ?int
    {
        return $this->entityId;
    }

    public function setEntityId(int $entityId): static
    {
        $this->entityId = $entityId;
        return $this;
    }

    public function getUserConnected(): ?User
    {
        return $this->userConnected;
    }

    public function setUserConnected(?User $userConnected): static
    {
        $this->userConnected = $userConnected;
        return $this;
    }

    public function getOldValues(): ?array
    {
        return $this->oldValues;
    }

    public function setOldValues(?array $oldValues): static
    {
        $this->oldValues = $oldValues;
        return $this;
    }

    public function getNewValues(): ?array
    {
        return $this->newValues;
    }

    public function setNewValues(?array $newValues): static
    {
        $this->newValues = $newValues;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;
        return $this;
    }
}
