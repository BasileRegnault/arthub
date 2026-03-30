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
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Metadata\Patch;
use Symfony\Component\Validator\Constraints as Assert;
use App\Entity\Traits\BlameableTrait;

use App\Repository\GalleryRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(
            security: "is_granted('ROLE_USER')",
            securityMessage: "Vous devez être connecté pour créer une galerie."
        ),
        new Put(
            security: "is_granted('ROLE_ADMIN') or object.getCreatedBy() == user",
            securityMessage: "Vous ne pouvez modifier que vos propres galeries."
        ),
        new Patch(
            security: "is_granted('ROLE_ADMIN') or object.getCreatedBy() == user",
            securityMessage: "Vous ne pouvez modifier que vos propres galeries."
        ),
        new Delete(
            security: "is_granted('ROLE_ADMIN') or object.getCreatedBy() == user",
            securityMessage: "Vous ne pouvez supprimer que vos propres galeries."
        )
    ],
    formats: [
        'jsonld' => ['application/ld+json'],
        'multipart' => ['multipart/form-data'],
        'json' => ['application/json'],
    ],
    normalizationContext: ['groups' => ['gallery:read']],
    denormalizationContext: ['groups' => ['gallery:write']]
)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: GalleryRepository::class)]
#[ApiFilter(SearchFilter::class, properties: [
    'name' => 'partial',
    'createdBy' => 'exact',
])]
#[ApiFilter(BooleanFilter::class, properties: [
    'isPublic'
])]
#[ApiFilter(DateFilter::class, properties: [
    'createdAt',
    'updatedAt'
])]
class Gallery
{
    use BlameableTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['gallery:read', 'user:detail', 'gallery:detail'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: "Le nom est requis.")]
    #[Assert\Length(
        max: 255,
        maxMessage: "Le nom ne peut pas dépasser {{ limit }} caractères."
    )]
    #[Groups(['gallery:read', 'gallery:write', 'user:detail', 'gallery:detail'])]
    private ?string $name = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(
        max: 255,
        maxMessage: "La description ne peut pas dépasser {{ limit }} caractères."
    )]
    #[Groups(['gallery:read', 'gallery:write', 'user:detail', 'gallery:detail'])]
    private ?string $description = null;

    #[ORM\ManyToOne(targetEntity: MediaObject::class)]
    #[ORM\JoinColumn(nullable: true)]
    #[ApiProperty(types: ['https://schema.org/image'])]
    #[Groups(['gallery:read', 'gallery:write', 'user:detail', 'gallery:detail'])]
    private ?MediaObject $coverImage = null;

    #[ORM\Column]
    #[Assert\NotNull(message: "Le statut de publication est requis.")]
    #[Groups(['gallery:read', 'gallery:write', 'user:detail', 'gallery:detail'])]
    private ?bool $isPublic = null;

    /**
     * @var Collection<int, Artwork>
     */
    #[ORM\ManyToMany(targetEntity: Artwork::class, inversedBy: 'galleries')]
    #[Groups(['gallery:read', 'gallery:write', 'gallery:detail'])]
    private Collection $artworks;

    #[ORM\Column(options: ['default' => 'CURRENT_TIMESTAMP'])]
    #[Groups(['gallery:read', 'gallery:detail'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['gallery:read', 'gallery:detail'])]
    private ?\DateTimeImmutable $updatedAt = null;

    #[Groups(['gallery:read'])]
    private ?int $views = null;

    public function __construct()
    {
        $this->artworks = new ArrayCollection();
    }

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

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getCoverImage(): ?MediaObject
    {
        return $this->coverImage;
    }

    public function setCoverImage(?MediaObject $coverImage): static
    {
        $this->coverImage = $coverImage;

        return $this;
    }

    public function getIsPublic(): ?bool
    {
        return $this->isPublic;
    }

    public function setIsPublic(bool $isPublic): static
    {
        $this->isPublic = $isPublic;

        return $this;
    }

    /**
     * @return Collection<int, Artwork>
     */
    public function getArtworks(): Collection
    {
        return $this->artworks;
    }

    public function addArtwork(Artwork $artwork): static
    {
        if (!$this->artworks->contains($artwork)) {
            $this->artworks->add($artwork);
        }

        return $this;
    }

    public function removeArtwork(Artwork $artwork): static
    {
        $this->artworks->removeElement($artwork);

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

    public function setViews(?int $views): static
    {
        $this->views = $views;
        return $this;
    }

    public function getViews(): ?int
    {
        return $this->views;
    }
}
