<?php

namespace App\Entity;

use App\Enum\ValidationStatus;
use App\Enum\ValidationSubjectType;
use App\Repository\ValidationDecisionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ValidationDecisionRepository::class)]
class ValidationDecision
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(enumType: ValidationSubjectType::class)]
    private ?ValidationSubjectType $subjectType = null;

    #[ORM\Column]
    private ?int $subjectId = null;

    #[ORM\Column(enumType: ValidationStatus::class)]
    private ?ValidationStatus $status = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $decidedBy = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $submittedBy = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $reason = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getSubjectType(): ?ValidationSubjectType { return $this->subjectType; }
    public function setSubjectType(ValidationSubjectType $subjectType): static { $this->subjectType = $subjectType; return $this; }

    public function getSubjectId(): ?int { return $this->subjectId; }
    public function setSubjectId(int $subjectId): static { $this->subjectId = $subjectId; return $this; }

    public function getStatus(): ?ValidationStatus { return $this->status; }
    public function setStatus(ValidationStatus $status): static { $this->status = $status; return $this; }

    public function getDecidedBy(): ?User { return $this->decidedBy; }
    public function setDecidedBy(User $decidedBy): static { $this->decidedBy = $decidedBy; return $this; }

    public function getSubmittedBy(): ?User { return $this->submittedBy; }
    public function setSubmittedBy(?User $submittedBy): static { $this->submittedBy = $submittedBy; return $this; }

    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $reason): static { $this->reason = $reason; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function setCreatedAt(\DateTimeImmutable $createdAt): static { $this->createdAt = $createdAt; return $this; }
}
