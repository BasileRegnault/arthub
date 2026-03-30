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
use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\QueryParameter;
use App\Filter\RolesFilter;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    paginationItemsPerPage: 10,
    paginationClientItemsPerPage: true,
    paginationClientEnabled: true,
    operations: [
        new GetCollection(
            security: "is_granted('ROLE_ADMIN')",
            securityMessage: "Seuls les administrateurs peuvent lister les utilisateurs."
        ),
        new Get(
            security: "is_granted('ROLE_ADMIN') or object == user",
            securityMessage: "Vous ne pouvez voir que votre propre profil."
        ),
        new Post(),
        new Put(
            security: "is_granted('ROLE_ADMIN') or object == user",
            securityMessage: "Vous ne pouvez modifier que votre propre profil."
        ),
        new Delete(
            security: "is_granted('ROLE_ADMIN')",
            securityMessage: "Seuls les administrateurs peuvent supprimer des utilisateurs."
        ),
        new Patch(
            security: "is_granted('ROLE_ADMIN') or object == user",
            securityMessage: "Vous ne pouvez modifier que votre propre profil."
        )
    ],
    normalizationContext: ['groups' => ['user:read']],
    denormalizationContext: ['groups' => ['user:write']],
    formats: [
        'jsonld' => ['application/ld+json'],
        'multipart' => ['multipart/form-data'],
        'json' => ['application/json'],
    ]
)]
#[ApiFilter(SearchFilter::class, properties: [
    'username' => 'ipartial',
    'email' => 'ipartial',
    'roles' => 'exact'
])]
#[ApiFilter(BooleanFilter::class, properties: [
    'isSuspended'
])]
#[ApiFilter(DateFilter::class, properties: ['createdAt'])]
#[ORM\HasLifecycleCallbacks]
#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['user:read', 'gallery:read', 'rating:read', 'user:detail', 'artwork:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255, unique: true)]
    #[Assert\NotBlank(message: "Le nom d'utilisateur est obligatoire.")]
    #[Assert\Length(
        min: 3,
        max: 255,
        minMessage: "Le nom d'utilisateur doit contenir au moins {{ limit }} caractères.",
        maxMessage: "Le nom d'utilisateur ne peut pas dépasser {{ limit }} caractères."
    )]
    #[Groups(['user:read', 'user:write', 'gallery:read','artist:read', 'rating:read', 'user:detail', 'artwork:read'])]
    private ?string $username = null;

    #[ORM\Column(length: 180)]
    #[Assert\NotBlank(message: "L'email est obligatoire.")]
    #[Assert\Email(message: "L'email '{{ value }}' n'est pas valide.")]
    #[Groups(['user:read', 'user:write', 'user:detail'])]
    private ?string $email = null;

    /**
     * @var list<string> Les rôles de l'utilisateur
     */
    #[ORM\Column(type: 'json', options: ['jsonb' => true])]
    #[Groups(['user:read', 'user:detail'])]
    private array $roles = [];

    /**
     * @var string Le mot de passe hashé
     */
    #[ORM\Column]
    #[Assert\NotBlank(message: "Le mot de passe est obligatoire.")]
    private ?string $password = null;

    #[ORM\ManyToOne(targetEntity: MediaObject::class)]
    #[ORM\JoinColumn(nullable: true)]
    #[ApiProperty(types: ['https://schema.org/image'])]
    #[Groups(['user:read', 'user:write', 'user:detail'])]
    private ?MediaObject $profilePicture = null;

    #[ORM\Column(options: ['default' => 'CURRENT_TIMESTAMP'])]
    #[Groups(['user:read', 'user:write', 'user:detail'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['user:read', 'user:write', 'user:detail'])]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\Column]
    #[Groups(['user:read', 'user:write', 'user:detail'])]
    private ?bool $isSuspended = false;

    /**
     * @var Collection<int, Gallery>
     */
    #[ORM\OneToMany(targetEntity: Gallery::class, mappedBy: 'createdBy')]
    #[Groups(['user:detail'])]
    private Collection $galleries;

    /**
     * @var Collection<int, Rating>
     */
    #[ORM\OneToMany(targetEntity: Rating::class, mappedBy: 'createdBy')]
    #[Groups(['user:detail'])]
    private Collection $ratings;

    /**
     * @var Collection<int, Artwork>
     */
    #[ORM\OneToMany(targetEntity: Artwork::class, mappedBy: 'createdBy')]
    #[Groups(['user:detail'])]
    private Collection $artworks;

    /**
     * @var Collection<int, Artist>
     */
    #[ORM\OneToMany(targetEntity: Artist::class, mappedBy: 'createdBy')]
    #[Groups(['user:detail'])]
    private Collection $artists;
    /**
     * @var Collection<int, UserLoginLog>
     */
    #[ORM\OneToMany(targetEntity: UserLoginLog::class, mappedBy: 'userConnected', orphanRemoval: true)]
    #[Groups(['user:detail'])]
    private Collection $userLoginLogs;

    /**
     * @var Collection<int, ActivityLog>
     */
    #[ORM\OneToMany(targetEntity: ActivityLog::class, mappedBy: 'userConnected')]
    #[Groups(['user:detail'])]
    private Collection $activityLogs;

    public function __construct()
    {
         $this->galleries = new ArrayCollection();
        $this->ratings = new ArrayCollection();
        $this->artworks = new ArrayCollection();
        $this->artists = new ArrayCollection();

        $this->userLoginLogs = new ArrayCollection();
        $this->activityLogs = new ArrayCollection();
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

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(string $username): static
    {
        $this->username = $username;

        return $this;
    }

    public function getIsSuspended(): ?bool
    {
        return $this->isSuspended;
    }

    public function setIsSuspended(?bool $isSuspended): static
    {
        $this->isSuspended = $isSuspended;

        return $this;
    }

    /**
     * Un identifiant visuel représentant cet utilisateur.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @see UserInterface
     * @return array Les rôles de l'utilisateur
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // Garantir que chaque utilisateur possède au moins le rôle ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     * @return string|null Le mot de passe hashé
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    /**
     * S'assurer que la session ne contient pas les hash de mots de passe réels en les hashant via CRC32C, supporté depuis Symfony 7.3.
     */
    public function __serialize(): array
    {
        $data = (array) $this;
        $data["\0".self::class."\0password"] = hash('crc32c', $this->password);

        return $data;
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
        // @deprecated, à supprimer lors de la mise à jour vers Symfony 8
    }

        public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
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

    /**
     * @return Collection<int, Gallery>
     */
    public function getGalleries(): Collection
    {
        return $this->galleries;
    }

    public function addGallery(Gallery $gallery): static
    {
        if (!$this->galleries->contains($gallery)) {
            $this->galleries->add($gallery);
            // IMPORTANT : côté propriétaire (Gallery)
            $gallery->setCreatedBy($this);
        }

        return $this;
    }

    public function removeGallery(Gallery $gallery): static
    {
        if ($this->galleries->removeElement($gallery)) {
            if (method_exists($gallery, 'getCreatedBy') && $gallery->getCreatedBy() === $this) {
                $gallery->setCreatedBy(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Rating>
     */
    public function getRatings(): Collection
    {
        return $this->ratings;
    }

    public function addRating(Rating $rating): static
    {
        if (!$this->ratings->contains($rating)) {
            $this->ratings->add($rating);
            $rating->setCreatedBy($this);
        }

        return $this;
    }

    public function removeRating(Rating $rating): static
    {
        if ($this->ratings->removeElement($rating)) {
            if (method_exists($rating, 'getCreatedBy') && $rating->getCreatedBy() === $this) {
                $rating->setCreatedBy(null);
            }
        }

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
            $artwork->setCreatedBy($this);
        }

        return $this;
    }

    public function removeArtwork(Artwork $artwork): static
    {
        if ($this->artworks->removeElement($artwork)) {
            if (method_exists($artwork, 'getCreatedBy') && $artwork->getCreatedBy() === $this) {
                $artwork->setCreatedBy(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Artist>
     */
    public function getArtists(): Collection
    {
        return $this->artists;
    }

    public function addArtist(Artist $artist): static
    {
        if (!$this->artists->contains($artist)) {
            $this->artists->add($artist);
            $artist->setCreatedBy($this);
        }

        return $this;
    }

    public function removeArtist(Artist $artist): static
    {
        if ($this->artists->removeElement($artist)) {
            if (method_exists($artist, 'getCreatedBy') && $artist->getCreatedBy() === $this) {
                $artist->setCreatedBy(null);
            }
        }

        return $this;
    }


    /**
     * @return Collection<int, UserLoginLog>
     */
    public function getUserLoginLogs(): Collection
    {
        return $this->userLoginLogs;
    }

    public function addUserLoginLog(UserLoginLog $userLoginLog): static
    {
        if (!$this->userLoginLogs->contains($userLoginLog)) {
            $this->userLoginLogs->add($userLoginLog);
            $userLoginLog->setUserConnected($this);
        }

        return $this;
    }

    public function removeUserLoginLog(UserLoginLog $userLoginLog): static
    {
        if ($this->userLoginLogs->removeElement($userLoginLog)) {
            // Mettre le côté propriétaire à null (sauf si déjà modifié)
            if ($userLoginLog->getUserConnected() === $this) {
                $userLoginLog->setUserConnected(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, ActivityLog>
     */
    public function getActivityLogs(): Collection
    {
        return $this->activityLogs;
    }

    public function addActivityLog(ActivityLog $activityLog): static
    {
        if (!$this->activityLogs->contains($activityLog)) {
            $this->activityLogs->add($activityLog);
            $activityLog->setUserConnected($this);
        }

        return $this;
    }

    public function removeActivityLog(ActivityLog $activityLog): static
    {
        if ($this->activityLogs->removeElement($activityLog)) {
            // Mettre le côté propriétaire à null (sauf si déjà modifié)
            if ($activityLog->getUserConnected() === $this) {
                $activityLog->setUserConnected(null);
            }
        }

        return $this;
    }

}
