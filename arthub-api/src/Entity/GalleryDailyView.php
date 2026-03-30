<?php

// Entité pour les vues journalières des galeries
namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: \App\Repository\GalleryDailyViewRepository::class)]
#[ORM\Table(name: 'gallery_daily_view')]
#[ORM\UniqueConstraint(
    name: 'uniq_gallery_user_day',
    columns: ['gallery_id', 'user_id', 'view_date']
)]
#[ORM\UniqueConstraint(
    name: 'uniq_gallery_ip_day',
    columns: ['gallery_id', 'ip_hash', 'view_date']
)]
class GalleryDailyView
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Gallery::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Gallery $gallery;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(name: 'view_date', type: 'date_immutable')]
    private \DateTimeImmutable $viewDate;

    #[ORM\Column(name: 'ip_hash', length: 64, nullable: true)]
    private ?string $ipHash = null;

    public function __construct(
        Gallery $gallery,
        \DateTimeImmutable $viewDate,
        ?User $user = null,
        ?string $ipHash = null
    ) {
        $this->gallery = $gallery;
        $this->viewDate = $viewDate;
        $this->user = $user;
        $this->ipHash = $ipHash;
    }
}
