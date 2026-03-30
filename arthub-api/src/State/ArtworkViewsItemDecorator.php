<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Artwork;
use App\Repository\ArtworkDailyViewRepository;

final class ArtworkViewsItemDecorator implements ProviderInterface
{
    public function __construct(
        private $decorated, // pas typé
        private ArtworkDailyViewRepository $viewsRepo,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?object
    {
        if ($operation->getClass() !== Artwork::class) {
            return $this->decorated->provide($operation, $uriVariables, $context);
        }

        $artwork = $this->decorated->provide($operation, $uriVariables, $context);

        if (!$artwork instanceof Artwork || null === $artwork->getId()) {
            return $artwork;
        }

        $counts = $this->viewsRepo->countTotalViewsByArtworkIds([$artwork->getId()]);
        $artwork->setViews($counts[$artwork->getId()] ?? 0);

        return $artwork;
    }
}
