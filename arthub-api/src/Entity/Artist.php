<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Annotation\Groups;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use App\Entity\Traits\BlameableTrait;
use App\State\ArtistProcessor;

use App\Repository\ArtistRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    paginationItemsPerPage: 10,
    paginationClientItemsPerPage: true,
    paginationClientEnabled: true,
    operations: [
        new GetCollection(),
        new Get(),
        new Post(
            processor: ArtistProcessor::class,
            security: "is_granted('ROLE_USER')",
            securityMessage: "Vous devez être connecté pour créer un artiste."
        ),
        new Put(
            security: "is_granted('ROLE_ADMIN') or object.getCreatedBy() == user",
            securityMessage: "Vous ne pouvez modifier que les artistes que vous avez créés."
        ),
        new Patch(
            security: "is_granted('ROLE_ADMIN') or object.getCreatedBy() == user",
            securityMessage: "Vous ne pouvez modifier que les artistes que vous avez créés."
        ),
        new Delete(
            security: "is_granted('ROLE_ADMIN')",
            securityMessage: "Seuls les administrateurs peuvent supprimer des artistes."
        )
    ],
    normalizationContext: ['groups' => ['artist:read']],
    denormalizationContext: ['groups' => ['artist:write']],
    formats: [
        'jsonld' => ['application/ld+json'],
        'multipart' => ['multipart/form-data'],
        'json' => ['application/json'],
    ]
)]
#[ApiFilter(SearchFilter::class, properties: [
    'firstname' => 'ipartial',
    'lastname' => 'ipartial',
    'nationality' => 'exact',
    'createdBy' => 'exact',
])]
#[ApiFilter(BooleanFilter::class, properties: [
    'isConfirmCreate',
    'toBeConfirmed'
])]
#[ApiFilter(DateFilter::class, properties: [
    'bornAt',
    'diedAt',
    'createdAt',
    'updatedAt',
])]
#[ApiFilter(OrderFilter::class, properties: [
    'firstname',
    'lastname',
    'bornAt'
], arguments: ['orderParameterName' => 'order'])]
#[Vich\Uploadable]
#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: ArtistRepository::class)]
class Artist
{
    use BlameableTrait;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['artist:read', 'artwork:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['artist:read', 'artist:write', 'artwork:read'])]
    #[Assert\NotBlank(message: "Le prénom est obligatoire.")]
    #[Assert\Length(min: 2, minMessage: "Le prénom doit faire au moins 2 caractères.")]
    private ?string $firstname = null;

    #[ORM\Column(length: 255)]
    #[Groups(['artist:read', 'artist:write', 'artwork:read'])]
    #[Assert\NotBlank(message: "Le nom est obligatoire.")]
    #[Assert\Length(min: 2, minMessage: "Le nom doit faire au moins 2 caractères.")]
    private ?string $lastname = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    #[Groups(['artist:read', 'artist:write'])]
    #[Assert\NotBlank(message: "La date de naissance est obligatoire.")]
    #[Assert\LessThanOrEqual("today", message: "La date de naissance ne peut pas être dans le futur.")]
    private ?\DateTimeImmutable $bornAt = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    #[Groups(['artist:read', 'artist:write'])]
    #[Assert\LessThanOrEqual("today", message: "La date de décès ne peut pas être dans le futur.")]
    private ?\DateTimeImmutable $diedAt = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['artist:read', 'artist:write'])]
    private ?string $nationality = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['artist:read', 'artist:write'])]
    private ?string $biography = null;

    #[ORM\Column(options: ['default' => 'CURRENT_TIMESTAMP'])]
    #[Groups(['artist:read', 'artist:write'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['artist:read', 'artist:write'])]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\ManyToOne(targetEntity: MediaObject::class)]
    #[ORM\JoinColumn(nullable: true)]
    #[ApiProperty(types: ['https://schema.org/image'])]
    #[Groups(['artist:read', 'artist:write'])]
    private ?MediaObject $profilePicture = null;

    #[ORM\Column(length: 512, nullable: true)]
    #[Groups(['artist:read', 'artist:write', 'artwork:read'])]
    private ?string $imageUrl = null;

    #[ORM\Column]
    #[Groups(['artist:read', 'artist:write'])]
    private ?bool $isConfirmCreate = true;

    #[ORM\Column]
    #[Groups(['artist:read', 'artist:write'])]
    private ?bool $toBeConfirmed = true;

    /**
     * @var Collection<int, Artwork>
     */
    #[ORM\OneToMany(targetEntity: Artwork::class, mappedBy: 'artist')]
    #[Groups(['artist:read'])]
    private Collection $artworks;

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

    public function getFirstname(): ?string
    {
        return $this->firstname;
    }

    public function setFirstname(string $firstname): static
    {
        $this->firstname = $firstname;

        return $this;
    }

    public function getLastname(): ?string
    {
        return $this->lastname;
    }

    public function setLastname(string $lastname): static
    {
        $this->lastname = $lastname;

        return $this;
    }

    public function getBornAt(): ?\DateTimeImmutable
    {
        return $this->bornAt;
    }

    public function setBornAt(\DateTimeImmutable $bornAt): static
    {
        $this->bornAt = $bornAt;

        return $this;
    }

    public function getDiedAt(): ?\DateTimeImmutable
    {
        return $this->diedAt;
    }

    public function setDiedAt(?\DateTimeImmutable $diedAt): static
    {
        $this->diedAt = $diedAt;

        return $this;
    }

    public function getNationality(): ?string
    {
        return $this->nationality;
    }

    public function setNationality(?string $nationality): static
    {
        $this->nationality = $nationality;

        return $this;
    }

    public function getBiography(): ?string
    {
        return $this->biography;
    }

    public function setBiography(?string $biography): static
    {
        $this->biography = $biography;

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

    public function getProfilePicture(): ?MediaObject
    {
        return $this->profilePicture;
    }

    public function setProfilePicture(?MediaObject $profilePicture): static
    {
        $this->profilePicture = $profilePicture;

        return $this;
    }

    public function getImageUrl(): ?string
    {
        return $this->imageUrl;
    }

    public function setImageUrl(?string $imageUrl): static
    {
        $this->imageUrl = $imageUrl;

        return $this;
    }

    public function getIsConfirmCreate(): ?bool
    {
        return $this->isConfirmCreate;
    }

    public function setIsConfirmCreate(?bool $isConfirmCreate): static
    {
        $this->isConfirmCreate = $isConfirmCreate;

        return $this;
    }

    public function getToBeConfirmed(): ?bool
    {
        return $this->toBeConfirmed;
    }

    public function setToBeConfirmed(?bool $toBeConfirmed): static
    {
        $this->toBeConfirmed = $toBeConfirmed;

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
            $artwork->setArtist($this);
        }

        return $this;
    }

    public function removeArtwork(Artwork $artwork): static
    {
        if ($this->artworks->removeElement($artwork)) {
            // Mettre le côté propriétaire à null (sauf si déjà modifié)
            if ($artwork->getArtist() === $this) {
                $artwork->setArtist(null);
            }
        }

        return $this;
    }
}
