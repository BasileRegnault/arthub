<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[Vich\Uploadable]
#[ORM\HasLifecycleCallbacks]
#[ORM\Entity]
#[ApiResource(
    normalizationContext: ['groups' => ['media_object:read']],
    types: ['https://schema.org/MediaObject'],
    operations: [
        new Get(),
        new GetCollection(),
        new Post(
            inputFormats: ['multipart' => ['multipart/form-data']],
            security: "is_granted('ROLE_USER')",
            securityMessage: "Vous devez être connecté pour uploader un fichier."
        )
    ]
)]
class MediaObject
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[Vich\UploadableField(mapping: 'artwork_image', fileNameProperty: 'filePath')]
    #[Assert\NotNull]
    #[Assert\Image(
        maxSize: '15M',
        mimeTypes: [
            'image/jpeg',
            'image/png',
        ],
        mimeTypesMessage: 'Formats autorisés : JPG, JPEG, PNG'
    )]
    public ?File $file = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['media_object:read'])]
    public ?string $filePath = null;

    #[Groups(['artwork:read','artist:read','user:read', 'media_object:read', 'user:detail', 'gallery:read', 'gallery:detail'])]
    public ?string $contentUrl = null;

    #[ORM\Column(type: 'datetime_immutable')]
    #[Groups(['media_object:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        if (!$this->createdAt) {
            $this->createdAt = new \DateTimeImmutable();
        }
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }
}
