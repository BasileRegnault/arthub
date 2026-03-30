<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Annotation\Groups;
use App\Entity\Traits\BlameableTrait;

use App\Repository\RatingRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_USER')"),
        new Put(security: "object.getCreatedBy() == user or is_granted('ROLE_ADMIN')"),
        new Delete(security: "object.getCreatedBy() == user or is_granted('ROLE_ADMIN')")
    ],
    normalizationContext: ['groups' => ['rating:read']],
    denormalizationContext: ['groups' => ['rating:write']]
)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: RatingRepository::class)]
class Rating
{
    use BlameableTrait;
    
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['rating:read', 'artwork:read', 'user:read', 'user:detail'])]
    private ?int $id = null;

    #[ORM\Column(type: 'float')]
    #[Assert\NotNull(message: "Le score est obligatoire.")]
    #[Assert\Range(
        min: 0,
        max: 5,
        notInRangeMessage: "Le score doit être compris entre {{ min }} et {{ max }}."
    )]
    #[Groups(['rating:read', 'rating:write', 'artwork:read', 'user:detail'])]
    private ?float $score = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['rating:read', 'rating:write', 'user:detail'])]
    private ?string $comment = null;

    #[ORM\ManyToOne(inversedBy: 'ratings')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Assert\NotNull(message: "L'œuvre est obligatoire.")]
    #[Groups(['rating:read', 'rating:write', 'user:detail'])]
    private ?Artwork $artwork = null;

    #[ORM\Column(options: ['default' => 'CURRENT_TIMESTAMP'])]
    #[Groups(['rating:read', 'rating:write', 'user:detail'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['rating:read', 'rating:write', 'user:detail'])]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
         if (!$this->createdAt) {
            $this->createdAt = new \DateTimeImmutable();
        }
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
        if (!$this->createdAt) {
            $this->createdAt = new \DateTimeImmutable();
        }
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getScore(): ?float
    {
        return $this->score;
    }

    public function setScore(float $score): static
    {
        $this->score = $score;

        return $this;
    }

    public function getComment(): ?string
    {
        return $this->comment;
    }

    public function setComment(?string $comment): static
    {
        $this->comment = $comment;

        return $this;
    }

    public function getArtwork(): ?Artwork
    {
        return $this->artwork;
    }

    public function setArtwork(?Artwork $artwork): static
    {
        $this->artwork = $artwork;

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

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }
}
