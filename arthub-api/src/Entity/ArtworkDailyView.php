<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: \App\Repository\ArtworkDailyViewRepository::class)]
#[ORM\Table(name: 'artwork_daily_view')]
#[ORM\UniqueConstraint(
    name: 'uniq_artwork_user_day',
    columns: ['artwork_id', 'user_id', 'view_date']
)]
#[ORM\UniqueConstraint(
    name: 'uniq_artwork_ip_day',
    columns: ['artwork_id', 'ip_hash', 'view_date']
)]
class ArtworkDailyView
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Artwork::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Artwork $artwork;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(name: 'view_date', type: 'date_immutable')]
    private \DateTimeImmutable $viewDate;

    #[ORM\Column(name: 'ip_hash', length: 64, nullable: true)]
    private ?string $ipHash = null;

    public function __construct(
        Artwork $artwork,
        \DateTimeImmutable $viewDate,
        ?User $user = null,
        ?string $ipHash = null
    ) {
        $this->artwork = $artwork;
        $this->viewDate = $viewDate;
        $this->user = $user;
        $this->ipHash = $ipHash;
    }
}
